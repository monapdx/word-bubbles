import json
from collections import defaultdict
from pathlib import Path

INPUT_FILE = "words.json"
OUTPUT_FILE = "prefixes.json"

# Prefix rules for each difficulty
PREFIX_RULES = {
    "easy": {
        "prefix_length": 2,
        "min_answers": 15,
        "max_answers": 60,
        "min_word_length": 4,
        "max_word_length": 14,
    },
    "medium": {
        "prefix_length": 3,
        "min_answers": 15,
        "max_answers": 60,
        "min_word_length": 4,
        "max_word_length": 15,
    },
    "hard": {
        "prefix_length": 4,
        "min_answers": 15,
        "max_answers": 60,
        "min_word_length": 5,
        "max_word_length": 16,
    },
}

# Optional: remove weird/unfun words
# Add anything you decide feels too obscure, technical, archaic, etc.
BANNED_WORDS = {
    # "chabouk",
    # "chaeta",
}

def normalize_word(word):
    if not isinstance(word, str):
        return None

    w = word.strip().lower()

    # keep simple alphabetic words only
    if not w.isalpha():
        return None

    if w in BANNED_WORDS:
        return None

    return w


def load_words(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("words.json must contain a JSON array of words.")

    words = []
    seen = set()

    for item in data:
        w = normalize_word(item)
        if w and w not in seen:
            seen.add(w)
            words.append(w)

    return sorted(words)


def build_prefix_group(words, prefix_length, min_word_length, max_word_length):
    groups = defaultdict(list)

    for word in words:
        if len(word) < min_word_length or len(word) > max_word_length:
            continue
        if len(word) < prefix_length:
            continue

        prefix = word[:prefix_length]
        groups[prefix].append(word)

    return groups


def score_prefix(prefix, words):
    """
    Higher score = better gameplay.
    This favors:
    - a healthy number of answers
    - a decent spread of word lengths
    - not all words looking too samey
    """
    count = len(words)
    unique_lengths = len(set(len(w) for w in words))
    avg_length = sum(len(w) for w in words) / count if count else 0

    # Favor prefixes closer to the middle of the target range
    target = 30
    count_score = max(0, 40 - abs(count - target))

    # Favor variety in word lengths
    length_variety_score = unique_lengths * 3

    # Slight preference for medium-length words
    avg_length_score = max(0, 12 - abs(avg_length - 8))

    return round(count_score + length_variety_score + avg_length_score, 2)


def filter_and_rank_groups(groups, min_answers, max_answers):
    results = []

    for prefix, word_list in groups.items():
        unique_words = sorted(set(word_list))
        count = len(unique_words)

        if min_answers <= count <= max_answers:
            results.append({
                "prefix": prefix,
                "count": count,
                "score": score_prefix(prefix, unique_words),
                "words": unique_words
            })

    # Best gameplay first
    results.sort(key=lambda item: (-item["score"], -item["count"], item["prefix"]))
    return results


def build_prefix_pools(words):
    output = {}

    for difficulty, rule in PREFIX_RULES.items():
        groups = build_prefix_group(
            words=words,
            prefix_length=rule["prefix_length"],
            min_word_length=rule["min_word_length"],
            max_word_length=rule["max_word_length"],
        )

        ranked = filter_and_rank_groups(
            groups=groups,
            min_answers=rule["min_answers"],
            max_answers=rule["max_answers"],
        )

        output[difficulty] = {
            "prefix_length": rule["prefix_length"],
            "min_answers": rule["min_answers"],
            "max_answers": rule["max_answers"],
            "min_word_length": rule["min_word_length"],
            "max_word_length": rule["max_word_length"],
            "total_prefixes": len(ranked),
            "rounds": ranked,
        }

    return output


def print_summary(pools):
    print("\nBuild complete.\n")
    for difficulty, data in pools.items():
        print(f"{difficulty.upper()}:")
        print(f"  prefix length: {data['prefix_length']}")
        print(f"  usable prefixes: {data['total_prefixes']}")

        preview = data["rounds"][:10]
        if preview:
            print("  sample prefixes:")
            for item in preview:
                print(
                    f"    {item['prefix'].upper():<5} "
                    f"{item['count']:>2} words "
                    f"(score {item['score']})"
                )
        else:
            print("  no usable prefixes found")
        print()


def main():
    input_path = Path(INPUT_FILE)
    output_path = Path(OUTPUT_FILE)

    if not input_path.exists():
        raise FileNotFoundError(f"Could not find {INPUT_FILE}")

    words = load_words(input_path)
    print(f"Loaded {len(words):,} normalized words from {INPUT_FILE}")

    pools = build_prefix_pools(words)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(pools, f, indent=2)

    print(f"Saved prefix pools to {OUTPUT_FILE}")
    print_summary(pools)


if __name__ == "__main__":
    main()