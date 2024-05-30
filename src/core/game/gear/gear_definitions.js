import gear_head_pug_model from '../../../assets/models/gear/head/pug.glb?url'

const /** @type Type.Gear.GearDefinitions */ gear_definitions = {
    head: {
      pug: {
        model_url: gear_head_pug_model,
        transforms: {
          chafer: {
            scale: 0.0325,
            rotation: [0.2, 0, 0],
            position: [0, -0.225, -0.051],
          },
          iop_male: {
            scale: 0.055,
            rotation: [0, 0, 0],
            position: [0, -0.3, 0.2],
          },
          iop_female: {
            scale: 4.1,
            rotation: [0, 0, 0],
            position: [0, -65, 35],
          },
          sram_male: {
            scale: 0.05,
            rotation: [0, 0, 0],
            position: [0, -0.2, 0],
          },
          sram_female: {
            scale: 90,
            rotation: [0, 0, 0],
            position: [0, -600, 300],
          },
        },
      },
    },
  }

export { gear_definitions }
