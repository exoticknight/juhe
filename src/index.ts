export type rawDatum = any

/**
 * the string or number retrurned from Classifier
 *
 * 特征提取返回的值
 */
export type resultKey = number | string

/**
 * result of classification
 *
 * 聚合的结果
 *
 * @member key characteristic of this group of rawdata
 * @member rawdata array of rawdata that share the same characteristic
 * @member value value of statistic
 */
export type resultItem = {
  key: resultKey,
  rawdata: rawDatum[],
  value: any
}

export type dotPathStr = string
/**
 * generate an dot access function for specified path
 *
 * 生成一个使用点操作符访问对应路径数据的访问器
 *
 * @param {dotPathStr} pathStr path string defined with dot access
 * @returns Fucntion
 */
function dotAccess(pathStr:dotPathStr):(obj:rawDatum) => any {
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

export enum Comparation {
  '==',
  '===',
  '!=',
  '!==',
  '<',
  '>',
  '<=',
  '>=',
}

const INTERNAL_ASSERTION:{[key in keyof typeof Comparation]:(a:any, b:any)=>boolean} = {
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

export type Assertion = dotPathStr
  | boolean
  | [dotPathStr, keyof typeof Comparation, string|number|boolean]
  | {'and': Assertion[]}
  | {'or': Assertion[]}
  | {'not': Assertion}

function where(assertion:Assertion):(rawDatum?:rawDatum, index?:number, rawarray?:rawDatum[]) => boolean {
  function assert(exp, data):boolean {
    if (typeof exp === 'boolean') {
      return exp
    }
    else if (typeof exp === 'string') {
      const access = dotAccess(exp)
      return !!access(data)
    } else if (Array.isArray(exp)) {
      const [lvalue, op, rvalue] = exp
      const access = dotAccess(lvalue)
      return INTERNAL_ASSERTION[op] && INTERNAL_ASSERTION[op](access(data), rvalue)
    } else if (exp.hasOwnProperty('and')) {
      return exp.and.every(e => assert(e, data))
    } else if (exp.hasOwnProperty('or')) {
      return exp.or.some(e => assert(e, data))
    } else if (exp.hasOwnProperty('not')) {
      return !assert(exp.not, data)
    } else {
      throw `[where] expression error ${exp}`
    }
  }

  return function(data) {
    return assert(assertion, data)
  }
}

// export enum Summary {
//   // 个数
//   'count',
//   // 和
//   'sum',
//   // 平方和
//   'sqsum',
//   // 最大值
//   'max',
//   // 最小值
//   'min',
//   // 众数
//   'mode',
//   // 中位数
//   'median',
//   // 平均数
//   'avg',
//   // 算术平均数
//   'mean',
//   // 几何平均数
//   'gmean',
//   // 标准差
//   'stdev',
//   // 方差
//   'variance',
//   // 百分位数
//   'percentile',
//   // 四分位数
//   'quantile',
//   // 偏度
//   'skewness',
// }

// const INTERNAL_SUMMARY:{[key in keyof typeof Summary]?:()=>number} = {
//   max: function() {
//     return 1
//   }
// }
// INTERNAL_SUMMARY

// function prepareSummary(summarys:Summary[], temp:{[key:string]:any}):void {
//   summarys
//   temp
// }
// prepareSummary
// function performSummary(summarys:Summary[], temp:{[key:string]:any}):{[key in keyof typeof Summary]?:number} {
//   summarys
//   temp
//   return {
//     max: 1
//   }
// }
// performSummary
export class Aggregator {
  private _last:Aggregator
  private context:{
    _initdata:rawDatum[]

    _shared:object
    _export:object
    _extract:(rawdatum:rawDatum, index?:number, array?:any[]) => resultKey
    _filter:(rawDatum?:rawDatum, index?:number, rawarray?:rawDatum[]) => boolean
    _calc?:(lastResult:any, current?:rawDatum, count?:number) => any
    _calc_base:any
    _sort?:Function
    // _summary?:Summary[]

    _transformer?:(rawDatum?:rawDatum, index?:number, rawarray?:rawDatum[]) => any

    _before?:Function
    _beforeEach?:Function
    _after?:Function
    _afterEach?:Function
  }

  constructor(last:Aggregator=null, initdata?:any[]) {
    this._last = last

    this.context = {
      _initdata: initdata,

      _shared: last ? last.context._shared : {},
      _export: {},

      _extract: (_, i) => i,
      _filter: () => true,
      _calc_base: 0,
    }
  }

  /**
   * pass a function to transform every datum before filtring
   *
   * 传入一个函数用以在过滤前对数据进行变换
   *
   * @param transformer function for transforming every datum
   * @returns {this} this
   * @memberof Aggregator
   */
  transform(transformer:(rawDatum?:rawDatum, index?:number, rawarray?:rawDatum[]) => any):this {
    if (typeof transformer === 'function') {
      this.context._transformer = transformer
    }
    return this
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
  filter(filter:(rawDatum?:rawDatum, index?:number, rawarray?:rawDatum[]) => boolean):this {
    if (typeof filter === 'function') {
      this.context._filter = filter
    }
    return this
  }

  /**
   * filter builder using and / or / not assertion, conflicts with .filter
   *
   * 使用逻辑语句构建过滤器，不能和 .filter 一起使用
   *
   * @example juhe.Assert.and([true, juhe.Assert.not(true)])
   *
   * @param {Assertion} assertion assertion
   * @returns {this}
   * @memberof Aggregator
   */
  where(assertion:Assertion):this {
    this.context._filter = where(assertion)
    return this
  }

  /**
   * use a function or dot access to extract characteristic for the classification later. You can access a field using dot access in 'path' to simplify your data in classifier
   *
   * 使用一个函数，或者直接指定路径访问，来将每一条数据进行特征提取。函数返回值将会作为分类的特征使用。可以在 path 中追加使用点操作符来简化 classifier 中数据访问
   *
   * @param classifier function that take an input and output the characteristic, or just the path
   * @param {string} path optional, just provides a shortcut access for classifier
   * @returns {this} this
   * @memberof Aggregator
   */
  classify(classifier:(datum:rawDatum, index?:number, array?:any[]) => resultKey|string, path?:string):this {
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
   * use a function to do some calculation for data in the same class
   *
   * 使用一个函数对同一类中的数据进行计算
   *
   * @param calculator a function to perform the calculation
   * @param {*} [base=0] initial result of calculation, default is 0
   * @returns {this} this
   * @memberof Aggregator
   */
  calc(calculator:(lsatResult:any, current?:rawDatum, count?:number) => any, base:any=0):this {
    if (typeof calculator === 'function') {
      this.context._calc = calculator
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
    this.context._calc = (b, o) => b + access(o)
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
    this.context._calc = x => x + 1
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
    this.context._calc = (result, current, count) => (result * access(current) + count) / (count + 1)
    return this
  }

  /**
   * use a comparison function to sort the index returned from the aggregation
   *
   * 使用一个比较函数对聚合结果进行排序
   *
   * @param comparator the comparison function
   * @returns {this} this
   * @memberof Aggregator
   */
  sort(comparator:(a:resultItem, b:resultItem) => 1 | 0 | -1):this {
    if (typeof comparator === 'function') {
      this.context._sort = comparator
    }
    return this
  }

  // summarize(summary:Summary[]):this {
  //   if (summary.length) {
  //     this.context._summary = summary
  //   }
  //   return this
  // }

  /**
   * run a callback after current aggregation and before sub-aggregation. The callback will be called with {indexes, items, shared}
   *
   * 在当前聚合执行后、子聚合执行前运行一个回调。回调的参数是 {indexes, resultMap, shared}
   *
   * @param callbackFn the callback that runs before all sub-aggregation
   * @returns {this} this
   * @memberof Aggregator
   */
  beforeAllSub(callbackFn:(args:{indexes:resultKey[], resultMap:Map<resultKey, resultItem>, shared:object}) => void):this {
    if (typeof callbackFn === 'function') {
      this.context._before = callbackFn
    }
    return this
  }

  /**
   * run a callback before each sub-aggregation. The callback will be called with {index, item, shared}
   *
   * 在每一个子聚合前运行一个回调。回调的参数是 {index, result, shared}
   *
   * @param callbackFn the callback that runs before each sub-aggregation
   * @returns {this} this
   * @memberof Aggregator
   */
  beforeEachSub(callbackFn:(args:{index:resultKey, result:resultItem, shared:object}) => boolean | void):this {
    if (typeof callbackFn === 'function') {
      this.context._beforeEach = callbackFn
    }
    return this
  }

  /**
   * run a callback before each sub-aggregation. The callback will be called with {index, item, shared}
   *
   * 在每一个子聚合后运行一个回调。回调的参数是 {index, result, shared}
   *
   * @param callbackFn the callback that runs after each sub-aggregation
   * @returns {this} this
   * @memberof Aggregator
   */
  afterEachSub(callbackFn:(args:{index:resultKey, result:resultItem, shared:object}) => boolean | void):this {
    if (typeof callbackFn === 'function') {
      this.context._afterEach = callbackFn
    }
    return this
  }

  /**
   * run a callback after sub-aggregation. The callback will be called with {indexes, items, shared}
   *
   * 在子聚合执行后运行一个回调。回调的参数是 {indexes, resultMap, shared}
   *
   * @param callbackFn the callback that runs after all sub-aggregation
   * @returns {this} this
   * @memberof Aggregator
   */
  afterAllSub(callbackFn:(args:{indexes:resultKey[], resultMap:Map<resultKey, resultItem>, shared:object}) => void):this {
    if (typeof callbackFn === 'function') {
      this.context._after = callbackFn
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
  shareIndexAs(varname:string):this {
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
  private $execute(next):void {
    function perform(data:any[]) {
      const retData = new Map<resultKey, resultItem>()
      const {
        _transformer: transformer,
        _filter: filter,
        _calc: calc,
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
            item.rawdata.push(datum)
            if (calc) {
              item.value = calc(item.value, datum, idx)
            }
          } else {
            retData.set(key, {
              key,
              rawdata: [datum],
              value: calc ? calc(this.context._calc_base, datum, idx): undefined
            })
          }
        }
      })

      const retIndex = [...retData.keys()]
      if (sort) {
        retIndex.sort((a:resultKey, b:resultKey) => {
          return sort(retData.get(a), retData.get(b))
        })
      }

      // export
      Object.keys(exportAs).forEach(key => {
        if (this.context._shared.hasOwnProperty(key)) {
          console.warn(`Shared space already has key '${key}' with value '${this.context._shared[key]}'`)
        } else {
          this.context._shared[key] = retIndex
        }
      })

      before && before({indexes:retIndex, resultMap:retData, shared:this.context._shared})

      if (next || beforeEach || afterEach) {
        for (let i = 0, len = retIndex.length; i < len; i++) {
          const result = retData.get(retIndex[i])

          if (beforeEach && beforeEach({index: i, result, shared:this.context._shared})) break

          next && next(result.rawdata)

          if (afterEach && afterEach({index: i, result, shared:this.context._shared})) break
        }
      }

      after && after({indexes:retIndex, resultMap:retData, shared:this.context._shared})
    }

    if (this._last) {
      this._last.$execute(perform.bind(this))
    } else {  // root data
      perform.call(this, this.context._initdata)
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
  private destroy():void {
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

export function from(data:rawDatum[]):Aggregator {
  return new Aggregator(null, data)
}

export const Assert = {
  and: function(...args:Assertion[]):Assertion {
    return {
      and: args
    }
  },

  or: function(...args:Assertion[]):Assertion {
    return {
      or: args
    }
  },

  not: function(assertion:Assertion):Assertion {
    return {
      not: assertion
    }
  }
}

export default {
  from,
  Assert
}