let $ = jquery = (function(window){
    // dom 存储，返回nodes数组，存放者selector的各个元素
    function Query(dom, selector) {
        let i, len = dom ? dom.length : 0
        for (let i = 0; i < len; i++) this[i] = dom[i]
        this.length = len
        this.selector = selector || ''
        return this
    }

    // 构造函数Z，用于生成jquery。目的是让jquery这个暴露对象更干净
    function Z(elements, selector) {
        return Query.call(this, elements, selector)
    }

    // 生成dom方法
    function qsa(element, selector) {
        return element.querySelectorAll(selector)
    }

    // 定义原型方法
    Z.prototype = {
        // 统一控制nodes的遍历方法
        each(callback) {
            // for (let i = 0; i < this.length; i++) { // Es5
            //     callback.call(this, i, this[i])  // 使用call去调用原for循环里的参数
            // }
            
            [].every.call(this, function(el, index) {  // Es6
                return callback.call(el, index, el) !== false
            })
        },

        // 添加样式类
        addClass(classes) {
            let classNames = classes.split(' ')
            classNames.forEach(cls => {
                this.each(function(index, node) {
                    node.classList.add(cls)
                })
            })
        },

        // 设置和修改内容
        setText(text) {
            this.each(function(index, node) {
                node.textContent = text
            })
        },

        // 定义查找方法
        find(selector) {
            let doms = []
            this.each(function(index, el) {
                let childs = this.querySelectorAll(selector)
                doms.push(...childs)
            })
            // 返回原实例，便于链式调用
            return new Z(doms, selector)
        },

        // 查找下标为i的node
        eq(i) {
            let doms = []
            this.each(function(index, el) {
                if (i === index) doms.push(this)
            })
            return new Z(doms, this.selector)
        },

        // 移除某个元素
        remove() {
            this.each(function(index, el) {
                this.remove()
            })
        }
    }

    // 定义全局方法示例
    function isFunction(fn) {
        return typeof fn === 'function'
    }

    // 实例化jquery对象，定义为$符号
    function $(nodeSelector) {
        let doms = qsa(document, nodeSelector)
        return new Z(doms, nodeSelector)
    }
    // 挂载全局方法
    $.isFunction = isFunction

    // 导出
    return $
})(window)