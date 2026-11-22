/**
 * framer-motion 的动画功能（animate / exit / hover / tap / variants），单独打一个 chunk。
 * App 用 LazyMotion 按需加载它，首屏只带体积很小的 m 组件；没加载完时组件先静态显示，加载完再开始动画。
 * 项目里没用 layout、drag 之类的功能，domAnimation 就够了；以后要用的话换成 domMax。
 */
export { domAnimation as default } from 'framer-motion';
