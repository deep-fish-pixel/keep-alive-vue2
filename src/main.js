import wrapRouter from './wrapRouter';

const KeepAliveVue2 = {
  name: 'KeepAliveVue2',
  props: {
    cached: Boolean,
    include: RegExp,
    exclude: RegExp,
    max: Number,
    name: String
  },
  data() {
    return {
      hasDestroyed: false,
      keepAliveRef: null,
      cache: {},
      disabledCachedKeys: {}
    };
  },
  methods: {
    before(route, prev, next) {
      if (this.hasDestroyed) {
        return next();
      }
      this.setKeepAliveRef();
      this.setMermoryCache();
      if (this.keepAliveRef && !wrapRouter.getKeepAlive()) {
        this.deleteCache(route);
      }
      next();
    },
    after(route) {
      if (this.hasDestroyed) {
        return true;
      }
      // 微前端中需要延迟较多时间
      setTimeout(() => {
        const isInit = !this.keepAliveRef;
        this.setKeepAliveRef();
        if (this.keepAliveRef && !this.cached) {
          this.deleteCache(route);
        }
        if (!this.cached && (isInit || !wrapRouter.getKeepAlive())) {
          this.restoreCached();
        }
        wrapRouter.setKeepAlive(true);
      }, 10);
    },
    setKeepAliveRef() {
      const cachePage = this.$refs.cachedPage;
      if (cachePage) {
        this.keepAliveRef = cachePage.$options.parent;
      }
    },
    setMermoryCache() {
      if (this.keepAliveRef && this.keepAliveRef.cache) {
        this.cache = {...(this.keepAliveRef.cache || {})};
      }
    },
    restoreCached() {
      const cachePage = this.$refs.cachedPage;
      if (cachePage) {
        const newCache = cachePage.$options.parent.cache;
        const oldCache = this.cache;
        Object.keys(newCache).forEach(key => {
          if(!oldCache[key]){
            this.setkeepAliveInValidate(newCache[key].componentInstance, key);
          }
        });
        cachePage.$options.parent.cache = this.cache;
      }
    },
    deleteCacheByKey(){
      const cache = this.cache;
      if (cache) {
        Object.keys(cache).some((index) => {
          if (this.disabledCachedKeys[index]) {
            delete cache[index];
            this.setkeepAliveInValidate(this.disabledCachedKeys[index], index);
            this.restoreCached();
          }
        });
      }
    },
    deleteCache(route){
      this.deleteCacheByName(route.name, route.matched && route.matched[0] && (route.matched[0].instances && route.matched[0].instances.default || route.matched[0].instances));
      this.deleteCacheByKey();
    },
    deleteCacheByName(name, instance){
      const cache = this.cache;
      if (cache) {
        Object.keys(cache).some((index) => {
          const item = cache[index];
          if(item && (item.name === name || item.componentInstance === instance)){
            delete cache[index];
            const cachePage = this.$refs.cachedPage;
            if (cachePage) {
              cachePage.$options.parent.cache = this.cache;
              cachePage.$options.parent.keys.pop();
            }
            return true;
          }
        });
      }
    },
    setkeepAliveInValidate(componentInstance, key){
      if (!componentInstance) {
        return;
      }
      const vnode = componentInstance.$vnode;
      if(vnode.data){
        vnode.data.keepAlive = false;
      }
      this.disabledCachedKeys[key] = componentInstance;
      const cachePage = this.$refs.cachedPage;
      if (cachePage) {
        cachePage.$options.parent.keys.pop();
      }
    }
  },

  created () {
    wrapRouter.wrap(this.$router.constructor.prototype);
    this.$router.beforeEach(this.before);
    this.$router.afterEach(this.after);
  },
  destroyed () {
    this.hasDestroyed = true;
  },
  render () {
    const createElement = this._self._c || this.$createElement;

    return [
      createElement(
        'keep-alive',
        {
          props: {
            include: this.include,
            exclude: this.exclude,
            max: this.max
          },
        },
        [createElement('router-view', {
          ref: "cachedPage",
          props: {
            name: this.name
          }
        })],
        1
      )
    ];
  }
};

export default {
  install(Vue) {
    Vue.component(KeepAliveVue2.name, KeepAliveVue2);
  }
};
