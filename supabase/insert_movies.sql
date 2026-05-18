-- =============================================
-- STOIKE - Inserimento Film (con dettagli)
-- =============================================
-- Esegui nel SQL Editor di Supabase:
-- Dashboard > SQL Editor > New query > Incolla > Run
-- =============================================

-- PRIMA esegui supabase_update.sql per aggiungere le nuove colonne!
-- Poi aggiorna il film esistente con trailer, trama e recensione:

UPDATE movies
SET
    trailer_url = 'https://www.youtube.com/watch?v=LHg-vbQS26U&pp=ygUZYWxpZW46cm9tdWx1cyB0cmFpbGVyIGl0YQ%3D%3D',
    synopsis = 'Mentre perlustra i meandri di una stazione spaziale abbandonata, un gruppo di giovani colonizzatori si trova faccia a faccia con la forma di vita più letale dell''universo.',
    review = 'Alien: Romulus riporta il franchise alle sue radici horror con un''atmosfera claustrofobica e terrificante. Fede Álvarez dirige con mano sicura un film che bilancia nostalgia e innovazione, regalando alcune delle sequenze più spaventose dell''intera saga.'
WHERE title = 'Alien: Romulus';
