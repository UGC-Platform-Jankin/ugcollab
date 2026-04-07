/**
 * Simple formula-based matching between a creator profile and campaigns.
 * Replaces AI-based matching for speed.
 */
export function computeCreatorCampaignMatches(
  profile: {
    platforms?: string[];
    country?: string | null;
    content_types?: string[] | null;
    followers?: number;
    past_collabs?: { brand_name: string }[];
  } | null,
  campaigns: {
    id: string;
    platforms?: string[] | null;
    target_regions?: string[] | null;
    is_free_product?: boolean;
    price_per_video?: number | null;
    requirements?: string | null;
    description?: string | null;
  }[]
): Record<string, number> {
  if (!profile || campaigns.length === 0) return {};

  const creatorPlatforms = new Set((profile.platforms || []).map(p => p.toLowerCase()));
  const creatorCountry = (profile.country || "").toLowerCase();
  const creatorContentTypes = new Set((profile.content_types || []).map(t => t.toLowerCase()));

  const result: Record<string, number> = {};

  for (const camp of campaigns) {
    let score = 0;
    let weights = 0;

    // Platform overlap (40% weight)
    const campPlatforms = (camp.platforms || []).map(p => p.toLowerCase());
    if (campPlatforms.length > 0) {
      const overlap = campPlatforms.filter(p => creatorPlatforms.has(p)).length;
      score += (overlap / campPlatforms.length) * 40;
    } else {
      score += 20; // no platform requirement = partial match
    }
    weights += 40;

    // Region match (25% weight)
    const regions = (camp.target_regions || []).map(r => r.toLowerCase());
    if (regions.length === 0 || regions.includes("worldwide") || regions.includes("world-wide")) {
      score += 25; // worldwide = full match
    } else if (creatorCountry && regions.some(r => r.toLowerCase().includes(creatorCountry) || creatorCountry.includes(r.toLowerCase()))) {
      score += 25;
    } else {
      score += 5; // small base score
    }
    weights += 25;

    // Content type relevance (20% weight) - check if campaign description/requirements mention creator's content types
    const campText = `${camp.description || ""} ${camp.requirements || ""}`.toLowerCase();
    if (creatorContentTypes.size > 0 && campText.length > 0) {
      let contentMatch = 0;
      creatorContentTypes.forEach(ct => {
        if (campText.includes(ct)) contentMatch++;
      });
      score += Math.min((contentMatch / creatorContentTypes.size) * 20, 20);
    } else {
      score += 10; // neutral
    }
    weights += 20;

    // Paid campaigns bonus (15% weight)
    if (!camp.is_free_product && camp.price_per_video && camp.price_per_video > 0) {
      score += 15;
    } else {
      score += 5;
    }
    weights += 15;

    const pct = Math.round(Math.min((score / weights) * 100, 100));
    result[camp.id] = pct;
  }

  return result;
}
