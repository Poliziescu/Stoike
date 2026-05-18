-- =============================================
-- STOIKE - Aggiunta cast (versione avanzata con foto)
-- =============================================
-- Esegui questo script nel SQL Editor di Supabase:
-- Dashboard > SQL Editor > New query > Incolla > Run
-- =============================================

-- Eliminiamo la colonna precedente (se l'avevi già creata come testo) e la ricreiamo in formato JSONB
ALTER TABLE movies DROP COLUMN IF EXISTS main_cast;
ALTER TABLE movies ADD COLUMN main_cast JSONB;

-- =============================================
-- Aggiorna "Alien: Romulus" con array JSON (nome + foto):
-- =============================================

UPDATE movies 
SET 
  main_cast = '[
    {
      "name": "Cailee Spaeny", 
      "photo_url": "https://cdn.britannica.com/61/275061-050-74D7FFE5/Actress-Cailee-Spaeny-May-2025.jpg"
    },
    {
      "name": "David Jonsson", 
      "photo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/David_Jonsson_by_Gage_Skidmore.jpg/250px-David_Jonsson_by_Gage_Skidmore.jpg"
    },
    {
      "name": "Archie Renaux", 
      "photo_url": "https://m.media-amazon.com/images/M/MV5BMGYzNGVhZjItODU1NS00YzBjLWJhMDEtYjA4Mjg2ZDRlNWQyXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg"
    },
    {
      "name": "Isabela Merced", 
      "photo_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNuI1jsVemeDuRTnjDBpR7Culw-tBA16SxqqFqk7pxE-HJKEDybBwkNttqYsHFF-uhDyl_a7lXO0FVRt9SFhbA2jeTETtjYuxbD5o3SK8X&s=10"
    }
  ]'::jsonb
WHERE title = 'Alien: Romulus';
