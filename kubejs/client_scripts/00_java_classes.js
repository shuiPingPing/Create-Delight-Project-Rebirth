// priority: 1200
// 由 CDR1201 的 00_java_classes.js 裁剪而来：只保留 ponder 场景/工具实际用到的成员（2026-09-22 迁移）。
// 注意：KubeJS 2101 里只有 startup 脚本能写 global（client/server 拿到的是 Collections.unmodifiableMap），
// 所以这里用顶层 var，跨文件共享（与 utils/ponder.js 的 PonderUtil 同机制）。
// 其余客户端脚本（tooltip/JEI/渲染等）迁入时，再把需要的成员补回来。
var CDClientJavaClasses = {
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
