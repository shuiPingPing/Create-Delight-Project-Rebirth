// CDC 2.0 的注册没有覆盖 forged_steel_ingot（同族的 block / sheet / molten 都在 Core 里，
// 唯独漏了锭），而 1.20.1 源包是在 registry_item.js 里自行注册它的；上游迁移过来的
// forged_steel / mbd2 配方依赖该物品（缺它就整批配方解析失败），故按原注册补回。
// 贴图（createdelightcore:item/forged_steel_ingot）与中英文名已在 createdelightcore 资源包内。
StartupEvents.registry('item', (event) => {
  event
    .create('createdelightcore:forged_steel_ingot')
    .texture('createdelightcore:item/forged_steel_ingot');
});
