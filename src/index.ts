
export type ResultKey = number | string
export type ResultItem = {
  key: ResultKey,
  data: any[],
  value: any  // the result of statistic
}
export type Result = ResultItem[]
export type ResultData = {
  [key:number]:any[]
  [key:string]:any[]
}

/**
 * accessor that use dot operation to access data with path predefined
 *
 * 使用点操作符访问数据的访问器，访问路径已被定义
 *
 * @param {any} obj anythin that supports dot access
 * @returns {any} the value or undefined if value does't exist
 */
export type DotAccessor = (obj:any) => any

/**
 * filter the datum and decide whether to accept it into statistic
 *
 * 过滤数据，决定是否接受此条目进行统计
 *
 * @param {any} datum the datum
 * @param {number} [index] index of the datum
 * @param {any[]} [array] the whole data array
 * @returns {boolean}
 */
export type Filter = (datum?:any, index?:number, array?:any[]) => boolean

/**
 * transform raw data into desired output
 *
 * 将原始数据转换成期望的数据类型
 *
 * @param {any} rawdatum the raw datum
 * @param {number} [index] index of the datum
 * @param {any[]} [array] the whole data array
 * @returns {any}
 */
export type Transformer = (rawdatum?:any, index?:number, array?:any[]) => any

/**
 * extract characteristic from datum
 *
 * 从数据里提取特征值
 *
 * @param {any} datum the datum
 * @param {number} [index] index of the datum
 * @param {any[]} [array] the whole data array
 * @returns {ResultKey}
 */
export type Classifier = (datum:any, index?:number, array?:any[]) => ResultKey

/**
 * calculate current statistic result based on last result and current data
 *
 * 根据上一次统计结果和当前读入的数据计算当前的的统计结果
 *
 * @param {any} result last result of calculation
 * @param {any} current current datum
 * @param {number} count numbers of data that has been dealt with
 * @returns {any} result of current calculation
 */
export type Calculator = (result:any, current?:any, count?:number) => any

/**
 * comparison function using in .sort() which is the same as Array.prototype.sort, except for requiring specified arguments.
 *
 * .sort() 中使用的比较函数，和 Array.prototype.sort 中一样，但是参数结构是特定的。
 *
 * @param {ResultItem} a operator a
 * @param {ResultItem} b operator b
 * @returns {boolean} result of comparison, -1 or 0 or 1
 */
export type Comparator = (a:ResultItem, b:ResultItem) => 1 | 0 | -1

/**
 * the callback that runs before all sub-aggregation
 *
 * 在所有子聚合执行前调用的回调函数
 *
 * @param {ResultKey[]} args.indexes the index of aggregation's result
 * @param {Map<ResultKey, ResultItem>} args.items result of aggregation
 * @param {object} args.shared public variables that exist in the whole aggregation
 */
export type BeforeCallbackFn = (args:{indexes:ResultKey[], items:Map<ResultKey, ResultItem>, shared:object}) => void

/**
 * the callback that runs after all sub-aggregation
 *
 * 在所有子聚合执行后调用的回调函数
 *
 * @param {ResultKey[]} args.indexes the index of aggregation's result
 * @param {Map<ResultKey, ResultItem>} args.items result of aggregation
 * @param {object} args.shared public variables that exist in the whole aggregation
 */
export type AfterCallbackFn = (args:{indexes:ResultKey[], items:Map<ResultKey, ResultItem>, shared:object}) => void

/**
 * the callback that runs before each sub-aggregation
 *
 * 在每一个子聚合执行前调用的回调函数
 *
 * @param {ResultKey[]} args.index the index of item
 * @param {ResultItem} args.item contains key: the characteristic, data: result of classification, value: result of statistic
 * @param {object} args.shared public variables that exist in the whole aggregation
 */
export type BeforeEachCallbackFn = (args:{index:ResultKey, item:ResultItem, shared:object}) => boolean | void

/**
 * the callback that runs after each sub-aggregation
 *
 * 在每一个子聚合执行后调用的回调函数
 *
 * @param {ResultKey[]} args.index the index of item
 * @param {ResultItem} args.item contains key: the characteristic, data: result of classification, value: result of statistic
 * @param {object} args.shared public variables that exist in the whole aggregation
 */
export type AfterEachCallbackFn = (args:{index:ResultKey, item:ResultItem, shared:object}) => boolean | void

const INTERNAL_OPERATION = {
  '==': function(a, b) {
    return a == b
  },
  '===': function(a, b) {
    return a === b
  },
  '!=': function(a, b) {
    return a != b
  },
  '!==': function(a, b) {
    return a !== b
  },
  '<': function(a, b) {
    return a < b
  },
  '>': function(a, b) {
    return a > b
  },
  '<=': function(a, b) {
    return a <= b
  },
  '>=': function(a, b) {
    return a >= b
  },
}

/**
 * generate an dot access function for specified path
 *
 * 生成一个使用点操作符访问对应路径数据的访问器
 *
 * @param {string} pathStr path string defined with dot access
 * @returns {DotAccessor} Fucntion
 */
export function dotAccess(pathStr:string):DotAccessor {
  const path = typeof pathStr === 'string' ? pathStr.split('.') : null
  return function(obj) {
    return path ? path.reduce((o, i) => {
      if (o && o.hasOwnProperty(i)) {
        return o[i]
      } else {
        return undefined
      }
    }, obj) : obj
  }
}

export class Aggregator {
  _last:Aggregator
  context:{
    _data:ResultData

    _shared:object
    _export:object
    _extract:Classifier
    _filter:Filter
    _agg?:Calculator
    _calc_base:any
    _sort?:Function

    _transformer?:Transformer

    _before?:Function
    _beforeEach?:Function
    _after?:Function
    _afterEach?:Function
  }

  static from(data:any[]):Aggregator {
    return new this(null, data)
  }

  constructor(last:Aggregator=null, data?:any[]) {
    this._last = last

    this.context = {
      _data: { '0': data },

      _shared: last ? last.context._shared : {},
      _export: {},

      _extract: (_, i) => i,
      _filter: () => true,
      _calc_base: 0,
    }
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
  filter(filter:Filter):this {
    if (typeof filter === 'function') {
      this.context._filter = filter
    }
    return this
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
  transform(transformer:Transformer):this {
    if (typeof transformer === 'function') {
      this.context._transformer = transformer
    }
    return this
  }

  where(path, op, value):this {
    this.context._filter = function(data) {
      const access = dotAccess(path)
      return this.context.data =  data.filter(d => INTERNAL_OPERATION[op] && INTERNAL_OPERATION[op](access[d], value))
    }
    return this
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
  classify(classifier:Classifier|string, path?:string):this {
    let access = null
    let extract = null
    if (typeof classifier === 'string') {
      access = dotAccess(classifier)
      extract = function(item) {
        return access(item)
      }
    } else if (typeof classifier === 'function') {
      if (path) {
        access = dotAccess(path)
      }
      extract = function(item, i, arr) {
        return classifier(access ? access(item) : item, i, arr)
      }
    }
    this.context._extract = extract
    return this
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
  calc(calculator:Calculator, base:any=0):this {
    if (typeof calculator === 'function') {
      this.context._agg = calculator
      this.context._calc_base = base
    }
    return this
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
  sum(path?:string, base:any=0):this {
    const access = dotAccess(path)
    this.context._agg = (b, o) => b + access(o)
    this.context._calc_base = base
    return this
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
  count(base:number=0):this {
    this.context._agg = x => x + 1
    this.context._calc_base = base
    return this
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
  avg(path?:string):this {
    const access = dotAccess(path)
    this.context._agg = (result, current, count) => (result * access(current) + count) / (count + 1)
    return this
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
  sort(comparator:Comparator):this {
    if (typeof comparator === 'function') {
      this.context._sort = comparator
    }
    return this
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
  before(fn:BeforeCallbackFn):this {
    if (typeof fn === 'function') {
      this.context._before = fn
    }
    return this
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
  beforeEach(fn:BeforeEachCallbackFn):this {
    if (typeof fn === 'function') {
      this.context._beforeEach = fn
    }
    return this
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
  afterEach(fn:AfterEachCallbackFn):this {
    if (typeof fn === 'function') {
      this.context._afterEach = fn
    }
    return this
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
  after(fn:AfterCallbackFn):this {
    if (typeof fn === 'function') {
      this.context._after = fn
    }
    return this
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
  exportIndexAs(varname:string):this {
    this.context._export[varname] = null
    return this
  }

  /**
   * ⚠️: You shouldn't use this function
   *
   * ⚠️：你用不上这个函数
   *
   * @memberof Aggregator
   */
  $execute(next):void {
    function perform(data:any[]) {
      const retData = new Map<ResultKey, ResultItem>()
      const {
        _transformer: transformer,
        _filter: filter,
        _agg: agg,
        _extract: extract,
        _sort: sort,
        _export: exportAs,

        _before: before,
        _beforeEach: beforeEach,
        _afterEach: afterEach,
        _after: after,
      } = this.context

      data.forEach((datum, idx, arr) => {
        if (transformer) datum = transformer(datum, idx, arr)
        if (filter(datum, idx, arr)) {
          const key = extract(datum, idx, arr)
          if (retData.has(key)) {
            const item = retData.get(key)
            item.data.push(datum)
            if (agg) {
              item.value = agg(item.value, datum, idx)
            }
          } else {
            retData.set(key, {
              key,
              data: [datum],
              value: agg ? agg(this.context._calc_base, datum, idx): undefined
            })
          }
        }
      })

      const retIndex = [...retData.keys()]
      if (sort) {
        retIndex.sort((a:ResultKey, b:ResultKey) => {
          return sort(retData.get(a), retData.get(b))
        })
      }

      // export
      Object.keys(exportAs).forEach(key => this.context._shared[key] = retIndex)

      before && before({indexes:retIndex, items:retData, shared:this.context._shared})

      if (next || beforeEach || afterEach) {
        for (let i = 0, len = retIndex.length; i < len; i++) {
          const item = retData.get(retIndex[i])

          if (beforeEach && beforeEach({index: i, item, shared:this.context._shared})) break

          next && next(item.data)

          if (afterEach && afterEach({index: i, item, shared:this.context._shared})) break
        }
      }

      after && after({indexes:retIndex, items:retData, shared:this.context._shared})
    }

    if (this._last) {
      this._last.$execute(perform.bind(this))
    } else {  // root data
      perform.call(this, this.context._data[0])
      // release memory
      this.destroy()
    }
  }

  /**
   * execute the aggregation
   *
   * 执行聚合
   *
   * @memberof Aggregator
   */
  execute():void {
    this.$execute(null)
  }

  /**
   * ⚠️: You shouldn't use this function
   *
   * ⚠️：你用不上这个函数
   *
   * @memberof Aggregator
   */
  destroy():void {
    this._last = null
    this.context = null
  }

  /**
   * 新建一个子聚合
   *
   * @returns {Aggregator}
   * @memberof Aggregator
   */
  sub():Aggregator {
    return new Aggregator(this)
  }
}

export const aggregator = {
  from(data:any[]):Aggregator {
    return new Aggregator(null, data)
  }
}