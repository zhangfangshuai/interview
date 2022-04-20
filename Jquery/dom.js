let $ = jQuery = (function(window) {
    // 创建构造函数
    let Jquery = function(nodeSelector) {
        // 实例属性，获取被选中的dom元素
        this.nodes = document.querySelectorAll(nodeSelector)
    }

    // 原型属性及方法
    Jquery.prototype = {
        // 统一管理对nodes遍历的for循环方法
        each: function(callback) {
            for (let i = 0; i < this.nodes.length; i++) {
                callback.call(this, i, this.nodes[i])  // 使用call去调用原for循环里的参数
            }
        },
        // 添加class
        addClass: function(classes) {
            let classNames = classes.split(' ');
            // 给指定元素添加传入的样式名
            classNames.forEach((cls) => {
                this.each(function(index, node) {
                    node.classList.add(cls)
                })
            })
        },

        // 设置及修改内容
        setText: function(text) {
            this.each(function(index, node) {
                node.textContent = text
            })
        }
    }

    // 导出方法、功能
    return function(nodeSelector) {
        return new Jquery(nodeSelector)
    }
})(window)