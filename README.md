# TABOK — True 3D Board Alpha

Version: **v0.66.0 — Render Discipline · 2026.09.09.I1**

## v0.66.0 — Render Discipline

- Physical dice now retain their geometry, materials, face maps, and emissive
  maps between casts. The prepared turn dice are reused by the roll itself,
  removing the largest allocation/upload hitch at the start of each throw.
- Mobile dice upload 256 px face maps while desktop keeps 512 px faces, reducing
  the secondary WebGL context's dice-texture memory by roughly 75% on phones and
  tablets without reducing their visible on-screen detail.
- The board and live sculpted portrait renderers now sleep behind the opaque 3D
  dice presentation, then resume with clean frame timing after it closes.
- Static ruin shadows are rendered on demand rather than rebuilt every frame;
  tiny rotating equipment no longer dirties the architectural shadow pass.
- Twelve individually animated Portal debris meshes are now one dynamic
  instanced mesh, retaining all Cinematic debris with one draw submission.

## v0.65.2 — Plunder Resolver

- Fixed automatic Grand Plunder leaving its resolver lock active after movement,
  which prevented the following TAKE, GIVE, or STEAL action from starting.
- Rune and normal treasure automation now use separate phase guards. Legacy
  resolver state is cleared at both phase boundaries so interrupted live games
  can recover instead of remaining on “resolving.”
- Only the authoritative host now marks an automatic choice as queued, avoiding
  non-host clients carrying a resolver state they are not allowed to execute.

## v0.65.1 — Restored Hexes

- Restored the board tiles to their previous six subtle worn-hex families.
- Retained the new varied perimeter pillars, rubble silhouettes, hanging chains,
  and three-depth starfield from the Fractured Reliquary update.

## v0.65.0 — Fractured Reliquary

- Expanded the board from six to eighteen deterministic worn-tile families,
  with asymmetrical corners, edge notches, rotated grain, and visibly different
  chips while preserving every logical hex center and walkable top height.
- Perimeter ruins now alternate between tall tapering monoliths, broken stumps,
  twin columns, and leaning towers, with varied courses and rubble silhouettes.
- Added sparse sagging low-poly iron chains beneath the fractured coast. Every
  link is instanced into one draw call, and mobile uses fewer links and spans.
- Distant ruin pillars now use four broken architectural profiles while retaining
  their existing single instanced draw call.

## v0.64.0 — Starfield Instrument

- Removed the global circular/vertical guide overlay and replaced bright roster
  quantity badges with tiny engraved counts.
- The sculpted Traveler preview now frames every model from chest to head using
  its measured bounds, keeping faces and tall hairstyles visible.
- The physical dice land on a thin obsidian celestial instrument with antique-
  bronze hairlines, compass ticks, and restrained diamond nodes.
- Replaced the purple nebula sky image with a memory-scaled three-depth field:
  baked distant noise-stars, one midground star texture, and ten camera-facing
  close-star sprites. It remains static and adds no animation loop.

## v0.63.0 — Tablet Gateway

- Character names now use a deliberate Save action, preventing lobby refreshes from interrupting typing on touch devices.
- Claiming a Traveler automatically casts and locks an available starting-position result.
- Existing position results survive later claims, character changes, and renames.
- iPad uses the portal-centered full-screen tabletop layout and a Safari-safe 3D tile material path.
- A lost mobile GPU context immediately reveals the compatibility board until 3D rendering recovers.

## v0.62.0 — Mobile Anchor

- Mobile Safari now receives memory-scaled versions of the same seamless sky
  and shared stone textures, avoiding the GPU-process eviction that could throw
  a player out of a running game.
- Phones use the existing illustrated Traveler preview instead of allocating a
  second WebGL renderer; the full 3D cast remains present on the board.
- Guest sessions remember their active room for the browser tab and rejoin with
  the same reserved seat automatically after an iOS suspension or brief network
  interruption.
- Cinematic is again the definitive highest-quality preset on desktop: six live
  temple lights, all portal arcs and debris, 2048px directional shadows, full
  actor animation cadence, and up to 1.5x adaptive render density.

## v0.61.0 — Celestial Concord

- Every modal, Portal judgment, Rune Bound notice, challenge, speech bubble,
  impact label, and cinematic title now shares the same minimal antique-gold
  observatory language.
- The active-Traveler pane renders the actual sculpted 3D character from chest
  to head, with a lightweight 15 FPS idle presentation independent of the board.
- Cinematic is now a 60 FPS-priority adaptive profile: render density reacts to
  measured frame time, animated actor shadows are removed, the live light count
  is halved, shadows are 1024 px, and distant moving scenery updates less often.

Starpath removes Replay Last Moment, lets a Traveler enter the Portal as soon
as any legal route reaches it within the remaining movement, and makes automatic
TAKE/GIVE/STEAL/Grand Plunder host-authoritative with a busy-animation retry.
New multiplayer rooms begin as an approachable two-player room: the host and
first arriving friend are claimed automatically, and a three-step lobby path
puts each player's initiative roll front and center. The surrounding sky is now
a seamless, static 4096×2048 equirectangular star field with layered nebulae,
thousands of varied stars, and mipmapped filtering; it adds no per-frame sky
animation or draw calls.

Celestial Instrument replaces the heavy card-and-panel treatment with an
ultra-light ancient-observatory interface: transparent side rails, antique-gold
hairlines, editorial Roman typography, open ceremonial frames, concentric
portrait markings, and restrained selected-state illumination. The treatment
is CSS-only—no extra canvas pass, blur filter, animation loop, or texture
download—so the richer presentation has negligible impact on gameplay frame rate.

Free Camera restores conventional desktop controls: hold the left mouse button
and drag to orbit, hold the right mouse button and drag to pan the camera and
its orbit target freely, and use the wheel to zoom. Simple left-clicks still
select legal hexes and board actors; clicking no longer changes the camera axis.

Decision Altar moves TAKE, GIVE, STEAL, Grand Plunder, Wild Surge, Riftwalk,
and Soul Exchange choices into one focused lower-center presentation shared by
the multiplayer UI. Soul Exchange and Grand Plunder also accept direct clicks
on eligible 3D Travelers. Hosts can enable automatic TAKE/GIVE/STEAL/Grand
Plunder resolution in the room setup; the preference is synchronized with the
whole room. Traveler hover cards now show both inventory and four-heart health.
The Ruin Sovereign spirals out of the Portal during its summon and uses a new
two-handed adjacent execution/grab animation before Answer-or-Die resolves.

Cosmic surroundings revision C1 adds a baked nebula/star background with a distant orange vortex, twelve ruined perimeter pillars, and drifting instanced rock fragments. No additional lights or shadow passes are introduced. Rocks update at 24 Hz (12 Hz and 36 fragments in Ultra); reduced-motion mode keeps them stationary. This is a procedural interpretation of the reference, not a reproduction of its illustrated scenery. Device frame rate still needs measurement in gameplay.

Ruin Focus makes Grand Plunder a single-target tactical action with an automatic fast volley, grounds Traveler movement in walk/run locomotion, gives Minor summons a faster heavy landing, expands Answer-or-Die readability, and introduces worn ruin-stone dice whose result marks alone ignite.

## Fractured Sanctuary board art

- Weathered charcoal stone replaces the polished network surfaces. Purple and
  teal mineral staining, carved traces, coherent cracks, and small mineral flecks
  preserve the original network colors while giving them a shared stone language.
- Hexes have clipped corners and narrow worn bevels. Every playable contact
  surface remains level at its original height; coordinates and picking are unchanged.
- A stacked rock foundation follows the original board perimeter, replacing the
  circular platter. Broken masonry and rubble occupy only blocked perimeter cells.
- Torches now sit on physical stands along the outer wall. Existing portal light,
  intermittent seam lightning, and Major escalation remain active.
- Soft contact shadows follow Travelers and monsters, including in lower quality
  modes that omit expensive character shadow maps.
- Five pairs of shared 512px stone/relief maps are derived from existing stone art
  at load time, with no new image downloads. Wear variations use geometry UVs and
  instance colors. Cliffs, rubble, and masonry use three instanced batches over
  one closed foundation mesh and add no dynamic lights.

Validation: `node --test tests/portal-events.test.cjs tests/ruin-board-art.test.cjs`.
Actual frame rate depends on device, viewport, quality setting, and scene activity.
The isolated `tests/board-art-preview.html` page uses the real board renderer,
six Travelers and a Minor, and reports frame timing and renderer counts. It also
allows orbiting, quality changes, and toggling Major escalation without a room.

## Ground Contact correction pass

- Traveler and Minor Monster bounds are fitted to the true playable-tile top
  after their complete transformed model is attached. The Major Monster's hover
  clearance is reduced by half.
- Sliding has been removed from Traveler locomotion. Entrance and rejection
  destinations reset Travelers to face the Portal.
- Actual Heart loss creates an animated overhead Heart counter and a short red
  emissive character highlight. Fully blocked damage does not show lost Hearts.
- The Major Mode die now has an EXTRA TURN face. It performs one immediate full
  three-die reroll and second turn, capped once per Monster Phase.
- The carried-pattern verdict waits until all three requirement cards and their
  rolling numbers finish. A successful MATCH arrives last with a gold resonance
  glow; NO MATCH uses a restrained danger treatment.

## Grounded Legends movement pass

- The visible actor plinths are gone. Invisible actor anchors preserve board
  selection and rules while Traveler and Minor Monster feet are fitted directly
  to the real 3D tile surface. Only the Major Monster remains airborne.
- Every moving actor turns toward its destination. Minor Monsters use a grounded
  quadruped walk; the Major keeps a folded-leg levitation pose while traveling.
- Travelers choose among walking, sliding, crouched traversal and jumping for
  shorter routes. Routes of three or more hexes shift to running and occasional
  acrobatic flips, without changing route legality or timing.
- Successful crossings display one of 50 deterministic randomized victory
  quips. Rejections display a separate pool of despair reactions. These actor-
  anchored speech bubbles are generated from the shared visual event, so every
  connected device sees the same line at the same moment.

## Living Diorama animation pass

- Each Traveler now cycles through 30 layered, personality-weighted idle
  behaviors. The variations combine head tracking, stance changes, equipment
  checks, guarded poses, gestures, and class-specific prop movement without
  loading additional animation files.
- Riftback Minor Monsters use 18 stalking, snapping, crouching, scraping, and
  tail-driven idle variations. The Ruin Sovereign uses 24 slower threat,
  channeling, surveying, crown, and posture behaviors.
- Idle gestures are staggered by character identity and separated by quiet
  breathing windows, preventing the board from animating noisily in unison.
- Rift Pounce now visibly enters the Portal, disappears inside it, and reappears
  above the selected landing hex before dropping onto the board.
- Rejected Travelers use a dedicated blasted-away pose with independently
  flailing arms and legs throughout the Portal knockback.
- Portal judgment reveals its three cards sequentially. Each card flips, its
  three digits cycle, the cycling slows dramatically, and the final requirement
  locks with a magical impact. A successful match now completes this reveal
  before the Traveler performs the 3D crossing leap.

These behaviors reuse the existing articulated geometry and update loop. They
add no textures, videos, downloaded models, lights, or draw calls.

## Rift Hunt gameplay rework

- Every Traveler now begins with 4 Hearts.
- M1, M2, and M3 arrive on Rejections 1–3 with permanent ×2 movement.
- The Minor Monster Action die is split between Attack and Rift Pounce. Attack
  strikes adjacent Travelers. Pounce marks a random legal hex, dives through the
  Portal, deals 2 damage on the landing hex and 1 damage around it, and scatters
  any Armor, Shield, or Rune Dice caught at the impact point.
- Rejection 4 summons the Major Monster. Later rejections add Major Rage: one,
  two, then three Fireball lanes, followed by an additional Portal lightning surge.
- Fireballs travel in unique hex directions and deal 2 damage to the first
  Traveler hit. A Shield reflects the full Fireball and breaks.
- Armor is permanent and reduces each incoming hit by 1, to a minimum of 1;
  it no longer changes maximum Health.
- Pounce and Fireball are explicit host-authored visual events, so the target,
  paths, timing, and 3D presentation are identical on every connected device.

Regression checks: `node --test tests/portal-events.test.cjs`.

## Portal Rituals

- Major summon: the board darkens, three spaced lightning strikes mark the ritual,
  the portal sphere parts, and the Sovereign rises slowly before floating to its hex.
  A temporary camera push-in returns to the previous view; dragging cancels the camera motion.
- Minor summon: the sphere opens and ejects a tumbling beast onto its assigned hex.
- Portal decisions use a compact, portal-anchored magical panel. All three complete
  requirement patterns and Resolve choices remain visible without hiding the board.
- Successful crossing releases the Traveler's name above the portal, then performs
  a victory gesture, leap and disappearance into the opening. No fullscreen crossing popup.
- Rejection charges the portal, releases an energy burst and throws the Traveler
  through the air to their original starting hex. Rule destinations are unchanged.
- Death separates the articulated head, torso and limb sections, with held equipment.
  Pieces tumble onto the board, settle, then fade and release their resources. Death
  waits briefly for a blocking answer popup to close so the breakup can be seen.
- Explicit host-issued visual events reach connected peers independently of snapshots.
  IDs prevent duplicate playback. Actors survive intervening snapshots, and receive
  the latest authoritative position when an animation completes. Late joiners receive
  the current board, not a replay of old summons.
- Animation deadlines release turns even if a browser suspends rendering. CPU turns
  and end-of-game results wait for queued sequences. The room's animation-speed setting
  controls sequence duration. Reduced-motion preferences shorten
  sequences and disable the camera push, shake, lightning bursts and large knockback arc.

No videos, new asset downloads, physics library or post-processing chain were added.
The opening reuses the existing portal shader on two low-resolution shell halves;
death reuses the existing rig geometry. This is not a guarantee of 60 FPS on every device.

Regression checks: `node --test tests/portal-events.test.cjs` (no dependencies).
Local browser QA also exercises the real board and game rules: summons, crossing,
rejection, death, all-Traveler Reckoning, CPU continuation, and compact card readability.

## Sculpted Ruins cast

The live board now uses the redesigned six Travelers and both Monsters. Open
`cast-showcase.html` to rotate every model under neutral studio lighting and
preview movement, dice, treasure, Rune, victory, Portal and summon states.

- Travelers have shaped jaws and brows, swept hair, fitted layered clothing,
  curved breastplates, edge trim, buckles, finger geometry and grip-mounted equipment.
- Each class retains its color identity and signature gear: Misty's scarf,
  Cliff's spectacles and tome, Paige's braid and lantern, Justin's sun shield,
  Sue's twin daggers, and Wanday's crystal staff and expedition pack.
- The Riftback has overlapping curved shell plates, swept horns, mandibles,
  articulated quadruped limbs and a segmented tail.
- The Ruin Sovereign has an exposed rib cage and rift core, clawed hands,
  layered obsidian armor, ragged mantle and a broken floating crown.
- Material response separates metal, cloth, leather, skin, bone and stone.
  Shared 256-pixel procedural albedo, bump and roughness maps add surface detail.
- Static details are merged by material within each joint: 40–69 mesh draws and
  approximately 19,000–29,000 triangles per model. No new per-character lights,
  downloaded model assets or post-processing passes are required.
- New materials owned by an actor are disposed when that actor leaves the board;
  shared texture maps remain cached for the other models.

These are stylized procedural real-time models with articulated rigid-part Bone
hierarchies. They are not film-resolution sculpts or deformable skinned GLB assets.
Board-scale readability and browser cost remain design constraints. Frame rate
depends on the device, resolution and complete scene, not model complexity alone.

Validation: all eight actors tested across eleven animation states for finite
geometry and transforms, connected arm joints, silhouette and draw budgets.
The real-board fixture also checks model creation, movement continuity, summon
and pickup effects, and actor material disposal.

## Complete 3D Traveler gallery

Open `character-3d-pilot.html` to inspect all six true-3D Traveler studies. Misty, Cliff, Paige, Justin, Sue, and Wanday each use lightweight browser-native geometry, distinctive equipment, character-colored lighting, idle motion, and a Portal-victory animation. Select a Traveler, drag to orbit, scroll or pinch to zoom, and use the presentation controls to compare poses.

The legacy gallery and the new cast showcase use the same model factories as the live board. The illustrated interface portraits are retained.

All six models use connected neck, shoulder, hip, and upper-leg geometry so their stylized anatomy reads as a continuous figure from every orbit angle.

Waist cores now overlap the torso and pelvis instead of relying on loose costume panels. Justin's sword and Misty and Sue's daggers are anchored at their leather grips, with hands above the guards and every sharp edge safely below the hand.

## 3D Monster gallery

Open `monster-3d-pilot.html` or `cast-showcase.html` to inspect the Riftback Minor Monster and the Ruin Sovereign Major Monster. Both pages use the new Sculpted Ruins models described above.

Both creatures include restrained idle motion, articulated movement and a summoning state, and are active in live board gameplay.

## Living board interactions

- A single GPU-driven energy surface now glows through the narrow hex seams and sends rare branching lightning beneath the board. When the Major Monster is present, the illumination strengthens, pulses faster, and lightning strikes more frequently. Ultra Performance retains a static glow and disables streak animation.
- Grey network stones now retain a darker charcoal-taupe value under bright moonlight and temple lighting, matching the visual weight of the teal and purple networks.
- Local host movement resolves directly from the true-3D hex under the pointer, fixing legal movement selections that could be swallowed by the multiplayer click bridge.

- Riftwalk destinations can be selected directly on the interactive 3D board, including from a remote Human player's device.
- Travelers and Monsters glide across the floor instead of hopping above it.
- Every occupied hex receives a restrained, color-matched glow beneath its actor.
- Rune Dice use textured astral stone, luminous inner crystal, and metallic edge detailing.
- Modeled Armor and Shield pickups now rotate and hover gently like the Rune Dice.

## Private turn rolls

- The full dice-roll presentation appears only on the device controlling the active Human Traveler.
- Other Human players receive the synchronized result without seeing that Traveler's popup.
- CPU rolls resolve globally without interrupting Human screens with a dice popup.
Build: **2026.09.04.V1**

### Veil Dome and modeled tokens

- Narrows the Portal architecture to a slim segmented bezel so it no longer obscures nearby playable hexes.
- Removes the four oversized square keystones and centers twenty brighter rune glyphs within the new bezel.
- Adds a translucent half-sphere force field with Fresnel edge glow, branching energy traces, and seven tiny procedural lightning arcs.
- Replaces neon Traveler and Monster bases with grounded, textured stone hex plinths and restrained metallic color inlays.
- Replaces flat Armor and Shield sprites with compact illuminated 3D models that receive the Temple lighting and cast real shadows.
- Scales dome lightning by the board quality setting to preserve the Ultra Performance target.

### Dramatic Temple Light pass

- Rebalances the arena around deep ambient shadow, a sharp cold overhead key, and a violet opposing rim light.
- Adds six localized warm entrance torches with subtle non-random flame and glow animation.
- Adds a color-reactive overhead Portal spotlight that changes with rejection, Reckoning, and Crossing states.
- Uses soft contact shadows and filmic highlight control while preserving tile readability.
- High Fidelity 60 uses three real torch lights; desktop Cinematic restores all six real lights while preserving every flame and glow.

### Living Stone material pass

- Preserves the exact point-top hex meshes, coordinates, spacing, and movement hit areas from Hex Lock.
- Replaces flat-looking tile color with optimized limestone, oxidized teal stone, and corrupted obsidian materials.
- Uses six deterministic rotations and tiny tone variations per material to break visible repetition without changing multiplayer state.
- Adds texture-driven roughness, stronger stone relief, dark beveled sides, worn brass traces, and restrained portal corruption.

### Hex Lock correction

- Board tiles and Character/Monster plinths now preserve TABOK's original point-top orientation, with a vertex at the top and bottom.
- Legal-movement outlines are rotated around the board's vertical world axis to match those point-top hexes at every camera angle.
- Verified against the original point-top reference in both direct top view and low 3D perspective.

### Displaced Ruins upgrade

- Portal ring caps now use true geometry displacement for uneven carved stone, chipped height variation, and recessed cracks.
- Portal keystones use subdivided geometry with restrained physical displacement.
- Hex tiles, the chamber floor, outer ruin columns, portal walls, and raised portal lips use lightweight bump relief for detail without multiplying board geometry.
- Movement, Action, and Rune dice faces now carry subtle raised relief across their frames, symbols, cracks, and pips.
- Ultra-performance mode automatically reduces true portal displacement strength; Full and automatic quality retain the complete depth treatment.

### Abyssal Portal upgrade

- Rebuilt the Portal as real perspective-correct 3D architecture with twenty individual stone ring segments, raised inner and outer lips, and four heavy keystones.
- Added a continuously animated GPU vortex with a dark abyss, spiraling violet currents, drifting sparks, turbulent energy around the rim, and levitating stone fragments.
- Added twenty luminous hand-drawn runes and two pulsing energy seams without adding any large image or video download.
- Portal colors now transition by event: violet while idle, pink on rejection, blood-magenta during Reckoning, and spectral cyan during a successful Crossing.
- The Portal remains clickable and centered as the board's camera axis from every viewing angle.

This build fixes two perspective-alignment issues:

- Minor Monsters now use an exact single-frame crop from their four-frame sheet and are foot-anchored to the center of their 3D plinth.
- Take, Give, Steal, and Grand Plunder treasure flights now aim at the Traveler's live camera-projected 3D position, so the target remains accurate after orbiting or zooming the board.

The normal turn-roll popup uses physical beveled 3D dice in a ritual casting tray. The obsidian Movement die uses glowing amber pips; the violet Action die uses wordless Take, Give, and Steal sigils. A Traveler bonded to a Rune casts a third cyan 3D die beside them, with six unique engraved power symbols. This three-die presentation remains physical even when the device requests reduced motion, using a shortened cast instead of reverting to the old flat popup. Results remain authoritative and deterministic. Monster dice retain their established interface in this focused pass.

## Starting the actual 3D version on a Mac

Do not double-click `index.html`. Browsers block the local JavaScript modules and will show the flat compatibility board.

1. Double-click `START-TABOK.command`.
2. Keep the Terminal window open while playing.
3. The game opens at `http://127.0.0.1:8773/index.html`.

GitHub Pages also serves the actual 3D version correctly. When 3D is active, the header says **True 3D ruins ready · drag to orbit**. Drag anywhere over the arena, use the mouse wheel to zoom, or use the ↶ and ↷ camera buttons.

## Actual 3D board space

- The board is rebuilt as real extruded hex geometry in a Three.js scene.
- The Portal is the world origin and permanent camera orbit axis.
- Hold the primary mouse button and drag to rotate around the arena. Use the
  mouse wheel to zoom. On touchscreens, drag to rotate and pinch to zoom.
- Hex selection uses 3D ray-picking, so legal movement remains clickable from
  every camera angle.
- Travelers, Monsters, equipment, Rune Dice, the ruin floor, perimeter walls,
  lighting, shadows, fog, and the animated Portal all occupy 3D world space.
- The live board now uses the complete sculpted cast: all six distinctive
  Travelers, the Riftback Minor Monster, and the chained Major Monster. Their
  gallery pedestals are removed in play so every model stands on the board's
  correctly aligned hex base.
- Models face toward the central Portal, retain restrained idle motion, slide
  with their existing gameplay actor, and keep their names available by
  hovering the occupied hex. Monster appearances begin with a short summon
  pose before settling into idle.
- Character animation is sampled at 30 fps (15 fps in Battery saver) while the
  board and camera continue rendering independently at up to 60 fps. Expensive
  model shadows are reserved for Cinematic mode.

## Living Cast animation system

- Every Traveler now has a named procedural skeleton made from hips, torso,
  upper arms, articulated forearms and hands, legs, and head. Held props are
  attached to hand joints rather than floating beside the body.
- The shared animation controller supports idle, character-specific walking,
  gliding or jumping, dice casting, grabbing, taking, giving, forceful stealing
  and Grand Plunder, catching treasure, Rune channeling, victory, and the final
  leap into the Portal.
- Minor Monsters emerge from the Portal in a fast arcing ejection with a short
  camera shock. The Major Monster arrival blacks out the ruin lighting, drives
  the Portal into a storm state, shakes the arena, and lands multiple lightning
  strikes before the Sovereign materializes.
- Rune Dice, Armor, and Shield pickups produce a short vertical light column,
  expanding floor rings, a local light flash, and a matching receive or Rune
  pose. Effects are temporary low-poly geometry and are disposed after use.
- Animation poses run on the established reduced-frequency actor update loop,
  so the board, camera, dice, and Portal may still render at 60 fps.
- Traveler and Monster artwork is presented as grounded camera-facing game
  miniatures, while their bases, tiles, items, and Portal are geometric objects.
- The existing SVG board is retained as an automatic compatibility fallback if
  WebGL or JavaScript modules cannot start.

Three.js 0.185.1 and OrbitControls are vendored inside `vendor/`, so GitHub Pages
does not need a runtime CDN for the 3D engine.

## Ground-contact correction

- Legal and route highlights are vertically compressed to follow the board's
  photographed floor perspective instead of displaying as upright hexagons.
- The black inset circles and separate black contact ellipses beneath Travelers
  have been removed.
- Traveler artwork is anchored six pixels lower and the remaining metallic base
  is shallower, placing the feet directly against the ground plane.

## Perspective calibration

- Traveler miniatures now occupy approximately one projected board hex instead
  of spanning several spaces.
- The Eclipse Well is flattened into the floor plane and scaled to the central
  opening in the supplied board artwork.
- Rune Dice, equipment, legal-destination glyphs, step reactions, and Monster
  threat marks use smaller grounded footprints matched to the board projection.
- All six starting anchors are registered directly to the illuminated white
  entrance plinths painted into the new board, rather than inferred from the old
  flat board grid.
- Minor Monsters fit one hex. The Major Monster remains visibly larger, but no
  longer reads as a separate oversized interface element.

## Spatial depth system

- Board locations are projected through a perspective-aware coordinate system.
- Travelers, Monsters, equipment, and Rune Dice scale continuously with depth:
  smaller at the far wall and larger toward the foreground.
- Moving pieces interpolate position and physical scale together, with a slight
  lifted midpoint so each step reads as movement through space.
- Actors are depth-sorted after every render, preventing a distant piece from
  incorrectly painting over a nearer one.
- Floor highlights change size with perspective, and every standing object has
  a contact shadow anchored to its floor coordinate.

## New board plate

- `assets/board-new-2_5d.jpg` is the authoritative visual ground plane.
- The interactive SVG layer uses a projected coordinate map aligned to the six
  illuminated entrance plinths, the perspective hex field, and central opening.
- Duplicate procedural hex rendering is disabled. Only gameplay overlays—legal
  routes, equipment, Rune Dice, threats, Travelers, Monsters, and the animated
  Portal—render above the supplied board art.
- The static high-resolution ground plane eliminates continuous GPU board draws
  while preserving animated game pieces and effects.

## What changed from the first redesign

- The supplied September 3 mockup is now the composition reference, not merely a
  color reference.
- A new high-resolution isometric ritual chamber forms the environmental plate:
  volcanic masonry, warm shrine light, violet fissures, vegetation, and carved
  ruin architecture frame the playable hex field.
- Board Travelers are full-body animated miniatures standing on colored metallic
  plinths instead of small cropped portrait badges.
- The right Traveler rail includes recognizable portrait medallions and expands
  the active Traveler, matching the mockup's roster hierarchy more closely.
- Raised 2.5D hex rendering, a shallow isometric board tilt, a larger central
  Crossing, compact active-Traveler HUD, expandable Rules & Codex, and a
  board-integrated dice altar create a more coherent tabletop composition.
- Safari-safe nested Portal rune transforms preserve the floating glyphs across
  Safari, Chrome, and Firefox.

The build remains a browser-native 2.5D interpretation. It does not pretend the
characters or dice are real-time 3D models; the goal is the mockup's hierarchy,
depth, illumination, and legibility while retaining the complete multiplayer game.

## Performance modes

- **High Fidelity 60** is the default for local and multiplayer rooms.
- The HTML interface remains Retina-sharp while only the 3D framebuffer adapts between 72% and 125% density to protect frame pacing.
- Repeated board tiles render as GPU-instanced batches, and invisible tile shadow casting is removed without changing the tile artwork.
- Performance 60+ disables costly secondary effects; High Fidelity 60 retains the full atmosphere and adapts before removing visible detail.
- Important gameplay animation remains: movement, dice, treasure transfers, Portal judgment, Crossing, Last Breath, and Answer-or-Die.
- The live FPS meter is always visible and can report high-refresh rates up to 240 FPS. Actual FPS follows the browser, device, refresh rate, and power settings.
- Cinematic highest quality, Performance 60+, and Battery saver remain available for comparison.

## Multiplayer alpha

- One player hosts a browser room and shares its short room code.
- The host can mix connected Humans and host-controlled CPU Travelers in any 1–6 player room. Open slots can be assigned individually or filled with CPU companions in one click.
- Human and CPU names and characters remain editable in the lobby. The host may also convert every active slot to CPU and run a fully automated spectator match with no Human seat required.
- The pre-game roll-off uses a shrinking pool of starting positions from `1` through the active Traveler count. Every Human or CPU roll locks one unused position permanently, removes it from later results, and makes ties impossible. Highest position acts first and lowest acts last.
- Every normal in-game Traveler turn now opens a character-focused dice scene. Human Travelers click to cast Movement, Action, and an owned Rune Die; CPU Travelers visibly prepare and automatically cast the same animated dice. The scene and raffle results synchronize to every connected device.
- The turn-roll scene exists only during the active Traveler's roll phase. Once the dice land, their final results remain on screen for approximately two seconds before movement begins.
- Turn dice brake dramatically before the final reveal: rapid raffle cycling eases into increasingly slow beats, then lands on “Fate has decided.” The result now holds for two seconds.
- The central Portal is now the lightweight vector **Eclipse Well**. Its colors and motion shift globally through Idle, Judgment, Crossing, Rejection, and Reckoning, with the authoritative host synchronizing the current state to every connected device.
- Host-controlled CPU Travelers now resolve Portal judgment, Last Breath, Answer-or-Die, and Major Monster message scenes automatically. The host may also tap their Continue button as a mobile-browser fallback; remote guests still cannot resolve another Traveler's decision.
- Sound controls are now local on every multiplayer device and can no longer be blocked or forwarded by game-turn ownership. Mobile Safari resumes audio on the next touch after interruptions. Master output is 50% louder, with a dynamics limiter preventing overload distortion.
- Dice-roll popup portraits now use an isolated, tighter vertical crop. Justin, Sue, and Wanday are anchored lower inside the hex so the source sheet's unused bottom strip never appears, without changing lobby, board, or character-preview portraits.
- The host is authoritative: remote devices send their legal clicks and challenge typing to the host, then receive the synchronized board, controls, Portal scenes, and results.
- The global room chat is fixed at the lower-left beneath the compact, independently scrollable guide.
- Refreshing a guest browser reserves and reclaims its slot using a local device token while the host remains online.
- PeerJS now receives Cloudflare STUN and optional TURN/TLS relay routes. The lobby reports whether TURN is ready, and a 15-second connection diagnostic explains failures instead of loading forever.
- `turn-relay/` contains the deployable Cloudflare Worker that safely issues 24-hour TURN credentials. Configure its public endpoint in `network-config.js`; never place the permanent TURN key in the game files.

The build uses PeerJS/WebRTC for browser-to-browser room traffic. Host it over HTTPS (GitHub Pages is suitable) and keep the host tab open for the entire expedition. Deploy the included TURN credential Worker for reliable play across mobile carriers, restrictive routers, VPNs, and different networks. See `turn-relay/README.md`. No player account is required. This is a casual-play alpha rather than an anti-cheat competitive server.

Grand Plunder now plays as a readable sequential barrage: each chosen treasure completes its full flight, lands on the collector, and updates the inventory before the next treasure launches.

Open `index.html` through a secure web host such as GitHub Pages, or serve this
folder locally. The game remains browser-only and requires no installation.

## Renderer

- The game requests WebGPU first for its cached high-resolution board, haunting
  Portal, GPU particles, and Living Ruins atmosphere.
- If WebGPU is unavailable or initialization fails, the same build retries with
  WebGL automatically. SVG remains the final compatibility renderer.
- Firefox direct `file://` launches use the full SVG compatibility board because
  Firefox can expose a GPU canvas while refusing the cached board texture. All
  hexes and gameplay remain available. Hosted builds continue to use WebGPU or
  WebGL automatically.
- The active renderer is displayed in the game header. Add `?debug` to the URL
  to show the live frame-rate meter.
- All W7 gameplay remains. Ultra mode intentionally removes continuous camera
  emphasis and spectral ambience; other quality modes retain those effects.

## Procedural sound

The W8 soundscape is generated live through the Web Audio API. No MP3 or WAV
files are downloaded.

- Low ruin drone and filtered wind ambience
- Dice casting and raffle-roll impact
- Traveler footsteps and Monster movement
- Separate Take, Give, Steal, Resolve, Rune, Shield, and damage cues
- Portal judgment, rejection, crossing, death, and Major Monster signatures
- Answer-or-Die and Last Breath warning tone
- A persistent **Sound on/off** control in the header

Browsers require a click or key press before audio may begin. The first player
interaction unlocks the sound engine automatically. The mute preference is
remembered on that device.

## Performance controls

- Character movement now updates persistent 3D actors in place. It no longer destroys and recreates every Traveler, Monster, item, glow, material, and geometry after each step, eliminating the hitch that made the Portal appear to restart.
- Equipment and Rune meshes rebuild only when their actual board inventory changes; legal highlights rebuild only when legal destinations change.
- The Portal animation clock remains continuous across movement, board synchronization, and multiplayer snapshots. Remote clients now apply the host's 3D Portal state directly as well as its compatibility-layer state.
- **High Fidelity 60** is now the default. The interface stays Retina-sharp while the 3D board gently adapts its internal resolution between demanding and quiet scenes.
- Board hexes are GPU-instanced, reducing hundreds of separate tile submissions to a few dozen without changing their textures or geometry.
- Floor tiles receive shadows but no longer waste time casting nearly invisible shadows; characters, Monsters, equipment, the Portal, and ruins retain dimensional lighting.
- All six lantern flames and glows remain visible while High Fidelity uses three real scene lights. Cinematic restores all six.
- Portal lightning retains its full animation but updates its irregular geometry at 30 Hz while camera movement, dice, characters, and the final render remain at 60 Hz.
- **Cinematic** is the highest-quality desktop profile and preserves the complete effect set while adapting render density only when necessary; **Performance 60+** and **Battery saver** remain the frame-rate-first profiles.
- Procedural audio uses a small number of native audio nodes and does not add
  network weight to the game.

## Living Arcane Tabletop interface

- The 3D board now receives more screen space through narrower, quieter side rails and a reduced header.
- Routine controls use carved-stone and bronze surfaces instead of bright flat UI fills, keeping attention on the board.
- The Traveler roster is denser and calmer; the active Traveler receives one clear framed state while inactive and defeated Travelers recede.
- Treasure accounting and recent events are collapsible ledgers. Global chat can also be minimized and remembers its local setting.
- Legal movement now appears as thin light leaking from the hex perimeter, with a precise hover response instead of oversized opaque rings.
- Occupied-hex light is softer and physically grounded; Major Monsters remain more intense without washing out nearby tile texture.
- Portal judgment and other major moments retain the strongest visual hierarchy while normal play remains spatially connected to the tabletop.

## Mobile Portal View

- On phones, the 3D tabletop now occupies the entire usable portrait or landscape viewport instead of sitting between stacked page sections.
- The responsive 3D camera uses the Portal as its fixed visual center and selects a wider portrait or landscape framing only when orientation changes.
- Turn controls appear as a compact translucent bottom sheet in portrait and a right-side command panel in landscape, leaving the board visible behind them.
- Room chat starts minimized on a phone and expands over the board when needed; rules, roster ledgers, and desktop-only camera hints no longer consume the mobile playfield.
- Safe-area spacing protects controls around iPhone notches, the Home indicator, and Safari browser chrome.

## Mobile Portal Judgment

- Portal decisions now replace the normal mobile game chrome with a dedicated full-screen judgment surface.
- Requirements are full-width, swipeable cards with an accessible `1 of 3` position indicator instead of three clipped desktop columns.
- Each card keeps its complete three-number combination and its own clearly labeled `Replace this card` Resolve action.
- The Traveler's carried pattern remains visible above the requirements for immediate comparison.
- Decorative borders, tiny letter spacing, and repeated framing are reduced; rejection is a restrained secondary action beneath the decision.
