-- Add the focused mistake taxonomy without rewriting historical classifications.
alter type mistake_type add value if not exists 'CONCEPT_CONFUSION';
alter type mistake_type add value if not exists 'SCOPE_ERROR';
alter type mistake_type add value if not exists 'KEYWORD_TRAP';
alter type mistake_type add value if not exists 'PREREQUISITE_GAP';
