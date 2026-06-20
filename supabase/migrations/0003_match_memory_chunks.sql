-- Brain hybrid retrieval: cosine-similarity search over memory_chunks (PRD §7.7).
-- Only freeform text (notes/voice/journal) is embedded; structured rows are
-- queried directly via SQL and never hit this function.
create or replace function match_memory_chunks(query_embedding vector(768), match_count int default 6)
returns table (id uuid, content text, source_type text, similarity float)
language sql stable as $$
  select id, content, source_type, 1 - (embedding <=> query_embedding) as similarity
  from memory_chunks
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
