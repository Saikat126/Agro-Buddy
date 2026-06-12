-- Migration: add map_link column to the vets table
-- Run this once in the Supabase SQL editor.

ALTER TABLE vets
  ADD COLUMN IF NOT EXISTS map_link TEXT;
