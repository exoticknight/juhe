"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const INTERNAL_OPERATION = {
    '==': function (a, b) {
        return a == b;
    },
    '===': function (a, b) {
        return a === b;
    },
    '!=': function (a, b) {
        return a != b;
    },
    '!==': function (a, b) {
        return a !== b;
    },
    '<': function (a, b) {
        return a < b;
    },
    '>': function (a, b) {
        return a > b;
    },
    '<=': function (a, b) {
        return a <= b;
    },
    '>=': function (a, b) {
        return a >= b;
    },
};
/**
 * generate an dot access function for specified path
 *
 * 生成一个使用点操作符访问对应路径数据的访问器
 *
 * @param {string} pathStr path string defined with dot access
 * @returns {DotAccessor} Fucntion
 */
function dotAccess(pathStr) {
    const path = typeof pathStr === 'string' ? pathStr.split('.') : null;
    return function (obj) {
        return path ? path.reduce((o, i) => {
            if (o && o.hasOwnProperty(i)) {
                return o[i];
            }
            else {
                return undefined;
            }
        }, obj) : obj;
    };
}
exports.dotAccess = dotAccess;
class Aggregator {
    static from(data) {
        return new this(null, data);
    }
    constructor(last = null, data) {
        this._last = last;
        this.context = {
            _data: { '0': data },
            _shared: last ? last.context._shared : {},
            _export: {},
            _extract: (_, i) => i,
            _filter: () => true,
            _calc_base: 0,
        };
    }
    /**
     * pass a function to filter data before aggregating
     *
     * 传入一个函数用以在聚合前过滤数据
     *
     * @param {Filter} filter function for filtering every datum
     * @returns {this} this
     * @memberof Aggregator
     */
    filter(filter) {
        if (typeof filter === 'function') {
            this.context._filter = filter;
        }
        return this;
    }
    /**
     * pass a function to transform every datum before aggregating
     *
     * 传入一个函数用以在聚合前对数据进行变换
     *
     * @param {Transformer} transformer function for transforming every datum
     * @returns {this} this
     * @memberof Aggregator
     */
    transform(transformer) {
        if (typeof transformer === 'function') {
            this.context._transformer = transformer;
        }
        return this;
    }
    where(path, op, value) {
        this.context._filter = function (data) {
            const access = dotAccess(path);
            return this.context.data = data.filter(d => INTERNAL_OPERATION[op] && INTERNAL_OPERATION[op](access[d], value));
        };
        return this;
    }
    /**
     * use a function or dot access to extract characteristic for the classification later. You can access a field using dot access in 'path' to simplify your data in classifier
     *
     * 使用一个函数，或者直接点访问，来将每一条数据进行特征提取。函数返回值将会作为分类的特征使用。可以在 path 中使用点操作符来简化 classifier 中数据访问
     *
     * @param {(Classifier|string)} classifier function that take an input and output the characteristic, or just the path
     * @param {string} path optional, just provides a shortcut access for classifier
     * @returns {this} this
     * @memberof Aggregator
     */
    classify(classifier, path) {
        let access = null;
        let extract = null;
        if (typeof classifier === 'string') {
            access = dotAccess(classifier);
            extract = function (item) {
                return access(item);
            };
        }
        else if (typeof classifier === 'function') {
            if (path) {
                access = dotAccess(path);
            }
            extract = function (item, i, arr) {
                return classifier(access ? access(item) : item, i, arr);
            };
        }
        this.context._extract = extract;
        return this;
    }
    /**
     * use a function to do statistic for data in the same class
     *
     * 使用一个函数对同一类中的数据进行统计
     *
     * @param {Calculator} calculator a function to perform the statistical analysis
     * @param {*} [base=0] initial result of statistic,default is 0
     * @returns {this} this
     * @memberof Aggregator
     */
    calc(calculator, base = 0) {
        if (typeof calculator === 'function') {
            this.context._agg = calculator;
            this.context._calc_base = base;
        }
        return this;
    }
    /**
     * use a path to access value in datum and accumulate it. Shortcut of .calc((result, current) => result + current, 0)
     *
     * 使用点操作符访问数据并将其累加。基本就是 .calc((result, current) => result + current, 0)
     *
     * @param {string} [path] path to access data, support dot access
     * @param {*} [base=0] initial result of statistic,default is 0
     * @returns {this} this
     * @memberof Aggregator
     */
    sum(path, base = 0) {
        const access = dotAccess(path);
        this.context._agg = (b, o) => b + access(o);
        this.context._calc_base = base;
        return this;
    }
    /**
     * count the number of datum. Shortcut of .calc((result) => result + 1, base)
     *
     * 统计数据条目数。基本就是 .calc((result) => result + 1, base)
     *
     * @param {number} [base=0] initial result of statistic,default is 0
     * @returns {this} this
     * @memberof Aggregator
     */
    count(base = 0) {
        this.context._agg = x => x + 1;
        this.context._calc_base = base;
        return this;
    }
    /**
     * Shortcut of .calc((result, current, count) => (result * current + count) / (count + 1))
     *
     * ⚠️: You should calculate average by your own because this method may lead to an inaccurate result
     *
     * 基本就是 .calc((result, current, count) => (result * current + count) / (count + 1))
     *
     * ⚠️：你应该通过其他方法计算平均值，因为此函数的结果有可能非常不准确
     *
     * @param {string} [path] path to access data, support dot access
     * @returns {this} this
     * @memberof Aggregator
     */
    avg(path) {
        const access = dotAccess(path);
        this.context._agg = (result, current, count) => (result * access(current) + count) / (count + 1);
        return this;
    }
    /**
     * use a comparison function to sort the index that will be provided to user
     *
     * 使用一个比较函数对聚合结果进行排序
     *
     * @param {Comparator} comparator the comparison function
     * @returns {this} this
     * @memberof Aggregator
     */
    sort(comparator) {
        if (typeof comparator === 'function') {
            this.context._sort = comparator;
        }
        return this;
    }
    /**
     * run a callback after current aggregation and before sub-aggregation. The callback will be called with {indexes, items, shared}
     *
     * 在当前聚合执行后、子聚合执行前运行一个回调。回调的参数是 {indexes, items, shared}
     *
     * @param {BeforeCallbackFn} fn the callback
     * @returns {this} this
     * @memberof Aggregator
     */
    before(fn) {
        if (typeof fn === 'function') {
            this.context._before = fn;
        }
        return this;
    }
    /**
     * run a callback before each sub-aggregation. The callback will be called with {index, item, shared}
     *
     * 在每一个子聚合前运行一个回调。回调的参数是 {index, item, shared}
     *
     * @param {BeforeEachCallbackFn} fn the callback
     * @returns {this} this
     * @memberof Aggregator
     */
    beforeEach(fn) {
        if (typeof fn === 'function') {
            this.context._beforeEach = fn;
        }
        return this;
    }
    /**
     * run a callback before each sub-aggregation. The callback will be called with {index, item, shared}
     *
     * 在每一个子聚合后运行一个回调。回调的参数是 {index, item, shared}
     *
     * @param {AfterEachCallbackFn} fn the callback
     * @returns {this} this
     * @memberof Aggregator
     */
    afterEach(fn) {
        if (typeof fn === 'function') {
            this.context._afterEach = fn;
        }
        return this;
    }
    /**
     * run a callback after sub-aggregation. The callback will be called with {indexes, items, shared}
     *
     * 在子聚合执行后运行一个回调。回调的参数是 {indexes, items, shared}
     *
     * @param {AfterCallbackFn} fn the callback
     * @returns {this} this
     * @memberof Aggregator
     */
    after(fn) {
        if (typeof fn === 'function') {
            this.context._after = fn;
        }
        return this;
    }
    /**
     *
     *
     * 将当前聚合结果的整个索引以某个命名导出。其结果可以在某些 API 参数的 `shared` 对象中读取到。
     *
     * @param {string} varname the name
     * @returns {this} this
     * @memberof Aggregator
     */
    exportIndexAs(varname) {
        this.context._export[varname] = null;
        return this;
    }
    /**
     * ⚠️: You shouldn't use this function
     *
     * ⚠️：你用不上这个函数
     *
     * @memberof Aggregator
     */
    $execute(next) {
        function perform(data) {
            const retData = new Map();
            const { _transformer: transformer, _filter: filter, _agg: agg, _extract: extract, _sort: sort, _export: exportAs, _before: before, _beforeEach: beforeEach, _afterEach: afterEach, _after: after, } = this.context;
            data.forEach((datum, idx, arr) => {
                if (transformer)
                    datum = transformer(datum, idx, arr);
                if (filter(datum, idx, arr)) {
                    const key = extract(datum, idx, arr);
                    if (retData.has(key)) {
                        const item = retData.get(key);
                        item.data.push(datum);
                        if (agg) {
                            item.value = agg(item.value, datum, idx);
                        }
                    }
                    else {
                        retData.set(key, {
                            key,
                            data: [datum],
                            value: agg ? agg(this.context._calc_base, datum, idx) : undefined
                        });
                    }
                }
            });
            const retIndex = [...retData.keys()];
            if (sort) {
                retIndex.sort((a, b) => {
                    return sort(retData.get(a), retData.get(b));
                });
            }
            // export
            Object.keys(exportAs).forEach(key => this.context._shared[key] = retIndex);
            before && before({ indexes: retIndex, items: retData, shared: this.context._shared });
            if (next || beforeEach || afterEach) {
                for (let i = 0, len = retIndex.length; i < len; i++) {
                    const item = retData.get(retIndex[i]);
                    if (beforeEach && beforeEach({ index: i, item, shared: this.context._shared }))
                        break;
                    next && next(item.data);
                    if (afterEach && afterEach({ index: i, item, shared: this.context._shared }))
                        break;
                }
            }
            after && after({ indexes: retIndex, items: retData, shared: this.context._shared });
        }
        if (this._last) {
            this._last.$execute(perform.bind(this));
        }
        else { // root data
            perform.call(this, this.context._data[0]);
            // release memory
            this.destroy();
        }
    }
    /**
     * execute the aggregation
     *
     * 执行聚合
     *
     * @memberof Aggregator
     */
    execute() {
        this.$execute(null);
    }
    /**
     * ⚠️: You shouldn't use this function
     *
     * ⚠️：你用不上这个函数
     *
     * @memberof Aggregator
     */
    destroy() {
        this._last = null;
        this.context = null;
    }
    /**
     * 新建一个子聚合
     *
     * @returns {Aggregator}
     * @memberof Aggregator
     */
    sub() {
        return new Aggregator(this);
    }
}
exports.Aggregator = Aggregator;
exports.aggregator = {
    from(data) {
        return new Aggregator(null, data);
    }
};
//# sourceMappingURL=index.js.map