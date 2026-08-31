// Attaches reviewCount + averageRating to listing objects without mutating query logic

export function enrichListingWithStats(listing) {
  const ratings = Array.isArray(listing.feedbacks)
    ? listing.feedbacks.map(f => (typeof f.rating === 'number' ? f.rating : null)).filter(v => v !== null)
    : [];
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  return {
    ...listing,
    reviewCount: listing.feedbacks?.length ?? 0,
    averageRating: Math.round(avg * 10) / 10
  };
}

export function enrichListingsWithStats(listings) {
  return listings.map(enrichListingWithStats);
}
