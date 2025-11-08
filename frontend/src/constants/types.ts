export type MatchStatus =
  | "IDLE"
  | "LOADING"
  | "QUEUED"
  | "MATCH_FOUND"
  | "REQUEST_EXPIRED"
  | "CANCELLED"
  | "ERROR";