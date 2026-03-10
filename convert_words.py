words = []

with open("words_alpha.txt", "r") as f:
    for line in f:
        w = line.strip().lower()
        if w.isalpha():
            words.append(w)

import json

with open("words.json", "w") as f:
    json.dump(words, f)