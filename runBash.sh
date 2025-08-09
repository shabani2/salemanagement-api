#!/bin/bash

# Fichier à chercher dans tous les .ts et .js
find ./src -type f \( -name "*.ts" -o -name "*.js" \) | while read file; do
  # On remplace uniquement les lignes où il y a 'import ... from "multer"'
  sed -i.bak 's|from[[:space:]]\+"multer"|from "../Models/multerType"|g' "$file"
done

# Supprimer les fichiers .bak générés par sed
find ./src -type f -name "*.bak" -delete

echo "✅ Tous les imports de multer ont été remplacés par ../Models/multerType"
