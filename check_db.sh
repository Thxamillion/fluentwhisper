#!/bin/bash
# Save this as check_db.sh and run: bash check_db.sh

echo "=== DATABASE INFO ==="
sqlite3 translations/es-en.db "
SELECT 
  COUNT(*) as total_translations,
  (SELECT COUNT(DISTINCT lemma_from) FROM translations) as unique_words
FROM translations;
"

echo -e "\n=== TABLE SCHEMA ==="
sqlite3 translations/es-en.db ".schema translations"

echo -e "\n=== SAMPLE TRANSLATIONS (Common Words) ==="
sqlite3 translations/es-en.db "
SELECT lemma_from, translation 
FROM translations 
WHERE lemma_from IN ('amor', 'vida', 'tiempo', 'día', 'año', 'cosa', 'hombre', 'mujer', 'niño', 'ciudad')
ORDER BY lemma_from;
"

echo -e "\n=== RANDOM SAMPLE (10 words) ==="
sqlite3 translations/es-en.db "
SELECT lemma_from, translation 
FROM translations 
ORDER BY RANDOM() 
LIMIT 10;
"

echo -e "\n=== SEARCH FOR A WORD ==="
read -p "Enter a Spanish word to look up: " word
sqlite3 translations/es-en.db "
SELECT lemma_from, translation 
FROM translations 
WHERE lemma_from LIKE '%$word%' 
LIMIT 10;
"
