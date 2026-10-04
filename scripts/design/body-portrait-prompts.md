# Body portrait generation

Created with the built-in image-generation tool. Final asset:
`assets/images/body-portrait-pants.png`. The supplied personal portrait was the face
reference, and the supplied Arnold Schwarzenegger photograph was the pose and
physique reference. The original photographs are not copied into the site.

## First prompt

Create ONE finished website illustration asset, portrait 1024x1536, transparent background with genuine alpha. Use reference1 for the young man's face identity: his dark swept-up wavy hair, thick defined eyebrows, strong straight nose, broad jawline, subtle closed-mouth smile. Use reference2 ONLY for exact full-body pose and exaggerated muscular Arnold Schwarzenegger physique: classic three-quarter rear twisting bodybuilding pose, one arm arched overhead, opposite arm extended diagonally to the left with upturned open hand, one leg planted and the other crossing behind on tiptoe. Turn the head a little more toward the viewer than reference2 so the facial likeness to reference1 is legible, but preserve the recognizable pose. It must be an elegant, highly considered sparse contour LINE DRAWING entirely in coffee brown #6b5742, designed to sit on cream #f3efe5, NOT a photo, not a realistic colored painting, not a cartoon stickman. Flowing confident fine pen contours, carefully chosen internal muscle contours, no crosshatching, no gray shading, no paper grain, no ground shadows, no background, no labels, no text, no charts, no decorative symbols, no heart icon (the website will add an animated heart separately). Dark hair can be expressed through a few denser wavy line clusters but avoid huge filled black areas. Preserve full hands, feet and overhead arm inside canvas, with slim margins. Modest plain short bodybuilding posing trunks, contour outline only. This is one human figure for a personal health dashboard, line detail clear at approximately 330px wide. The identity comes from the user portrait, not Arnold's face.

## Final edit prompt

Edit this illustration for a real website asset. KEEP exactly the same pose, face, identity, composition, proportions, brown contour lines, hands and feet. Replace ALL the checkerboard texture and background with completely flat PURE WHITE #ffffff. No transparency checkerboard or other pattern anywhere. Also replace the pale beige fill inside the body with PURE WHITE #ffffff, so this becomes brown pen line art on a completely white field. Remove fine shading/hatching but retain confident outer contours, chosen muscle definition contours, facial features and hair lines. Do not redraw or change the face or pose. No shadows, no gradients, no color wash, no lettering. Same portrait1024x1536 framing.

The first output baked a checkerboard into RGB pixels instead of providing
alpha, so only the second output is used. Its white field blends into the
site's existing cream background using CSS multiply blending.

## Full-length pants edit, 2026-10-04

Edited the existing raster with the built-in image-generation tool using
`referenced_image_paths`. The selected output remains 1024 × 1536 pixels and
replaces the original portrait as `assets/images/body-portrait-pants.png`; no resize or other image
transformation was applied. The figure's face, upper body, pose, feet, and
framing were visually checked against the original. Opaque workout joggers now
cover the hips, buttocks, and legs through the ankles. The existing SVG anatomy
anchors are unchanged.

### Exact edit prompt

Use case: identity-preserve.
Asset type: existing personal website full-body line-art portrait; precise clothing edit.
Input image 1 is the edit target. Edit ONLY the lower-body clothing: replace the skimpy posing trunks and bare legs with modest, opaque, full-length workout jogger pants. The pants must fully cover the entire hips, buttocks, crotch, thighs, knees, and calves, with a secure waistband at the existing waist and cuffs at the ankles. Use a relaxed tailored fit with restrained fabric folds; do not show underlying buttock-cleft or leg muscle lines through the fabric. Bare feet remain visible and unchanged. Express the pants in the same coffee-brown contour linework with an opaque white interior, not a solid dark block.
Preserve exactly the man's recognizable face, curly hair, expression, head, entire bare upper body, all arm/hand positions, muscular torso, leg pose, feet, overall proportions and all figure locations. Preserve the three-quarter rear twisting bodybuilding pose, the overhead flexed arm and extended opposite arm. Keep every unchanged line and detail as close to the original as possible. Do not shift, zoom, rotate, crop, or reframe the figure: the website overlays fixed anatomy markers at the current coordinates. Keep the exact 1024x1536 portrait canvas and original margins, with head near the same top position and both feet near the same bottom positions.
Retain the current coffee-brown pen linework on the same flat white field, which the site blends onto cream. Do not change the background, add shading, texture, scenery, text, labels, logos, symbols, accessories, or watermarks. The sole requested change is full-length opaque pants.
