// priority: 1200
// 由 CDR1201 的 00_java_classes.js 裁剪而来：只保留 ponder 场景/工具实际用到的成员（2026-09-22 迁移）。
// 其余客户端脚本（tooltip/JEI/渲染等）迁入时，再把需要的成员补回来。
global.CDClientJavaClasses = {
  $ACParticleRegistry: Java.loadClass(
    'com.github.alexmodguy.alexscaves.client.particle.ACParticleRegistry'
  ),
  $BlockStateProperties: Java.loadClass(
    'net.minecraft.world.level.block.state.properties.BlockStateProperties'
  ),
  $CreateSceneBuilder: Java.loadClass('com.simibubi.create.foundation.ponder.CreateSceneBuilder'),
  $ItemParticleOption: Java.loadClass('net.minecraft.core.particles.ItemParticleOption'),
  $ParticleTypes: Java.loadClass('net.minecraft.core.particles.ParticleTypes'),
};
