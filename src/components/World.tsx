/**
 * The fixed backdrop. Every layer is a single <i> painted entirely in CSS
 * gradients — no image requests, so the whole world costs nothing to load and
 * stays crisp at any zoom.
 *
 * Layer opacities come from --l-* custom properties which [data-biome] swaps
 * in index.css, so changing section changes the world without React
 * re-rendering anything here.
 */
export default function World() {
  return (
    <div className="world" aria-hidden>
      <i className="w-stars" />
      <i className="w-clouds" />
      <i className="w-hills" />
      <i className="w-ench" />
      <i className="w-trees" />
      <i className="w-cherry" />
      <i className="w-grass" />
      <i className="w-dirt" />
      <i className="w-stone" />
      <i className="w-ores" />
      <i className="w-torch" />
      <i className="w-torches" />
      <i className="w-glyphs" />
      <i className="w-dim" />
      <i className="w-scrim" />
    </div>
  );
}
