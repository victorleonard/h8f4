export interface PropalProposal {
  id: string;
  title: string;
  artist: string;
  proposedBy: string;
  createdAt: string;
  artworkUrl?: string;
  spotifyUrl?: string;
  deezerUrl?: string;
  youtubeUrl?: string;
}

export interface PropalMember {
  id: string;
  label: string;
  createdAt: string;
}

export interface PropalRating {
  memberId: string;
  label: string;
  score: number;
}

export interface PropalProposalView extends PropalProposal {
  averageRating: number;
  ratingCount: number;
  ratings: PropalRating[];
  proposedByLabel: string;
}

export interface PropalListResponse {
  proposals: PropalProposalView[];
  members: PropalMember[];
}
