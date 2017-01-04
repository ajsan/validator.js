(function( global, factory ) {

	if ( typeof module === "object" && typeof module.exports === "object" ) {
		// For CommonJS and CommonJS-like environments where a proper window is present,
		// execute the factory and get jQuery
		// For environments that do not inherently posses a window with a document
		// (such as Node.js), expose a jQuery-making factory as module.exports
		// This accentuates the need for the creation of a real window
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {
    var EventListener = function(obj, type, handle) {
    try { // Chrome、FireFox、Opera、Safari、IE9.0及其以上版本
      obj.addEventListener(type, handle, false);
    } catch (e) {
      try { // IE8.0及其以下版本
        obj.attachEvent('on' + type, handle);
      } catch (e) { // 早期浏览器
        obj['on' + type] = handle;
      }
    }
  }
  var PATTERN = []; //存放校验规则
  var noop = function() {}

  var uuid = (function(){
    var id = 1;
    return function(){
      return id++;
    }
  })()
  var extend = function (child, parent, isOver) { //扩展对象
    if(arguments.length < 2){
      return child;
    }
    for(var i in parent){
      if(Object.prototype.toString.call(parent[i]) === "[object Object]"){
        if(!child[i]){
          child[i] = {};
        }
        extend(child[i], parent[i], isOver);
      }
      if((child[i] && isOver) || !child[i]){
        child[i] = parent[i]
      }
    }
    return child;
  }

  //事件队列，方便做校验
  var asyncQueue = function(callback) {
    this.queue = [];
    this.callback = callback || noop;
    this.isRunning = false;
  }

  asyncQueue.prototype = {
    add: function(fn) {
      this.queue.push(fn);
    },
    run: function() {
      var me = this;
      if (this.isRunning) {
        return;
      }
      this.isRunning = true;
      var len = this.queue.length;

      var callbackLen = len;
      for (var i = 0; i < len; i++) {
        var queue = this.queue[i];
        queue(function() {
          callbackLen--;
          if (callbackLen == 0) {
            me.done();
          }
        })
      }
    },
    done: function() {
      this.isRunning = false;
      this.callback();
    }
  }

 /**
  * 针对每一个输入框的校验器
  * @param  {Object} opt 
  *         opt.el 需要校验的元素
  *         opt.events 校验需要触发的事件
  */
  var validator = function(opt) {
    this.opts = extend({
      el: null,
      events: []
    },opt , true);

    this.el = this.opts.el;
    if (!this.el) {
      throw new Error("校验规则需要有元素哦");
    }
    this.__status = false;
    this.uuid = uuid();
    var pattern = this.el.getAttribute("data-jvalidator") || "";
    this.pattern = pattern.replace(/\s+/g, '').split("&");
    this.addEvent();
  }

  validator.prototype = {
    addEvent: function() {
      var events = this.opts.events || [];
      var el = this.el;
      var me = this;
      for (var i = events.length - 1; i > -1; i--) {
        EventListener(el, events[i], function(e) {
          //Todo 判断是否校验通过
          me.check();
        })
      }
    },
    check: function(callback) {
      var me = this;
      var value = this.el.value;
      var pattern = this.pattern;
      var isLegal = true;
      var unLegalPattern = {};
      //新建队列,并提前写好回调函数
      var asyncQueueInstance = new asyncQueue(function() {
        var arr = [];
        for(var i in unLegalPattern){
          arr.push(unLegalPattern[i]);
        }
        me.opts.on[isLegal ? "valid" : "invalid"].call(me.el, arr);
        callback && callback(isLegal);
      });
      //给队列添加处理函数
      for (var i = 0, len = pattern.length; i < len; i++) {
        var ruleName = pattern[i];
        var realRule = PATTERN[ruleName];
        if (!realRule) {
          console.error("不存在校验规则:" + pattern[i] + "，请确认后提交");
        } else {
          asyncQueueInstance.add(function(next) {
            realRule.callback.call(this.el, value, function(result) {
              if (!result) {
                isLegal = result;
                unLegalPattern[realRule.name] = realRule;
              }
              next();
            });
          });
        }
      }

      //函数添加完毕之后要执行事件队列
      asyncQueueInstance.run();
    }
  }

  //校验管理器，负责管控整个表单的所有需要校验的元素
  var validatorManager = function(formEl, opts) {
    this.opts = extend({
      events: ["keyup", "blur"],
      on: {
        invalid: noop,
        valid: noop
      }
    }, opts || {}, true)
    this.form = formEl;
    this.validators = []; //存放所有的子校验
    this.init();
  }

  validatorManager.prototype = {
    init: function() {
      var $el = this.form.querySelectorAll("[data-jvalidator]");
      var len = $el.length;
      if (len) {
        for (var i = 0; i < len; i++) {
          var validatorInstance = new validator(extend({
            el: $el[i]
          }, this.opts));
          this.validators.push(validatorInstance);
        }
      }
    },
    /**
     * 校验整个表单全部时候填写正确
     * @param {Function} callback 执行完校验之后回调函数
     * @return {[type]} [description]
     */
    validateAll: function(callback) {
      var isLegal = true;
      var validators = this.validators;
      var len = validators.length;
      //新建队列,并提前写好回调函数
      var asyncQueueInstance = new asyncQueue(function() {
        callback && callback(isLegal);
      });

      for (var i = 0; i < len; i++) {
        (function(validator) {
          asyncQueueInstance.add(function(next) {
            validator.check(function(result) {
              if (!result) { //最后一个校验完毕
                isLegal = result;
              }
              next();
            });
          });

        })(validators[i]);
      }

      asyncQueueInstance.run();
    },
    //动态删除其中的校验规则，暂不实现
    remove: function(el) {
      var i = 0, validators = this.validators, len = validators.length;
      for(var i = len-1; i > -1; i--){
        if(validators[i].el === el){
          validators.splice(i, 1);
        }
      }
    },
    //动态添加规则,暂时不实现了
    add: function(el) {
      if(!el){
        throw new Error("添加规则缺少元素，请确认元素是否存在");
      }
      this.validators.push(new validator(extend({
        el: el
      }, this.opts)));
    }
  }

  validatorManager.addPattern = function(pattern) {
    if (!pattern.name) {
      return;
    }
    PATTERN[pattern.name] = pattern;
  }
})
