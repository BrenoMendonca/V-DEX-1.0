const SPRITES_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export function officialArtworkUrl(id) {
  return `${SPRITES_BASE}/other/official-artwork/${id}.png`;
}

export function defaultSpriteUrl(id) {
  return `${SPRITES_BASE}/${id}.png`;
}

export function animatedSpriteUrl(name) {
  return `https://play.pokemonshowdown.com/sprites/ani/${name}.gif`;
}

export function itemSpriteUrl(name) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${name}.png`;
}
