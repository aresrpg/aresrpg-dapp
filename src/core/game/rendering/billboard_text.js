import { createDerivedMaterial } from 'troika-three-utils'
import { Text } from 'troika-three-text'
import { MeshBasicMaterial } from 'three'

function create_billboard_material(base_material, keep_aspect) {
    return createDerivedMaterial(base_material, {
      // Declaring custom uniforms
      uniforms: {
        uSize: { value: keep_aspect ? 0.1 : 0.15 },
        uScale: { value: 1 },
      },
      // Adding GLSL code to the vertex shader's top-level definitions
      vertexDefs: `
  uniform float uSize;
  uniform float uScale;
  `,
      // Adding GLSL code at the end of the vertex shader's main function
      vertexMainOutro: keep_aspect
        ? `
  vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float distance = length(-mvPosition.xyz);
  float computedScale = uSize * uScale * distance;
  mvPosition.xyz += position * computedScale;
  gl_Position = projectionMatrix * mvPosition;
  `
        : `
  vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  vec3 scale = vec3(
    length(modelViewMatrix[0].xyz),
    length(modelViewMatrix[1].xyz),
    length(modelViewMatrix[2].xyz)
    );
  // size attenuation: scale *= -mvPosition.z * 0.2;
  mvPosition.xyz += position * scale;
  gl_Position = projectionMatrix * mvPosition;
  `,
      // No need to modify fragment shader for billboarding effect
    })
  }

function create_billboard_text() {
    const result = new Text()
    result.material = create_billboard_material(new MeshBasicMaterial(), false)
    return result
}

export {
    create_billboard_text,
};