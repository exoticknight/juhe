export declare type ResultKey = number | string;
export declare type ResultItem = {
    key: ResultKey;
    data: any[];
    value: any;
};
export declare type Result = ResultItem[];
export declare type ResultData = {
    [key: number]: any[];
    [key: string]: any[];
};
/**
 * accessor that use dot operation to access data with path predefined
 *
 * 使用点操作符访问数据的访问器，访问路径已被定义
 *
 * @param {any} obj anythin that supports dot access
 * @returns {any} the value or undefined if value does't exist
 */
export declare type DotAccessor = (obj: any) => any;
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
export declare type Filter = (datum?: any, index?: number, array?: any[]) => boolean;
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
export declare type Transformer = (rawdatum?: any, index?: number, array?: any[]) => any;
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
export declare type Classifier = (datum: any, index?: number, array?: any[]) => ResultKey;
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
export declare type Calculator = (result: any, current?: any, count?: number) => any;
/**
 * comparison function using in .sort() which is the same as Array.prototype.sort, except for requiring specified arguments.
 *
 * .sort() 中使用的比较函数，和 Array.prototype.sort 中一样，但是参数结构是特定的。
 *
 * @param {ResultItem} a operator a
 * @param {ResultItem} b operator b
 * @returns {boolean} result of comparison, -1 or 0 or 1
 */
export declare type Comparator = (a: ResultItem, b: ResultItem) => 1 | 0 | -1;
/**
 * the callback that runs before all sub-aggregation
 *
 * 在所有子聚合执行前调用的回调函数
 *
 * @param {ResultKey[]} args.indexes the index of aggregation's result
 * @param {Map<ResultKey, ResultItem>} args.items result of aggregation
 * @param {object} args.shared public variables that exist in the whole aggregation
 */
export declare type BeforeCallbackFn = (args: {
    indexes: ResultKey[];
    items: Map<ResultKey, ResultItem>;
    shared: object;
}) => void;
/**
 * the callback that runs after all sub-aggregation
 *
 * 在所有子聚合执行后调用的回调函数
 *
 * @param {ResultKey[]} args.indexes the index of aggregation's result
 * @param {Map<ResultKey, ResultItem>} args.items result of aggregation
 * @param {object} args.shared public variables that exist in the whole aggregation
 */
export declare type AfterCallbackFn = (args: {
    indexes: ResultKey[];
    items: Map<ResultKey, ResultItem>;
    shared: object;
}) => void;
/**
 * the callback that runs before each sub-aggregation
 *
 * 在每一个子聚合执行前调用的回调函数
 *
 * @param {ResultKey[]} args.index the index of item
 * @param {ResultItem} args.item contains key: the characteristic, data: result of classification, value: result of statistic
 * @param {object} args.shared public variables that exist in the whole aggregation
 */
export declare type BeforeEachCallbackFn = (args: {
    index: ResultKey;
    item: ResultItem;
    shared: object;
}) => boolean | void;
/**
 * the callback that runs after each sub-aggregation
 *
 * 在每一个子聚合执行后调用的回调函数
 *
 * @param {ResultKey[]} args.index the index of item
 * @param {ResultItem} args.item contains key: the characteristic, data: result of classification, value: result of statistic
 * @param {object} args.shared public variables that exist in the whole aggregation
 */
export declare type AfterEachCallbackFn = (args: {
    index: ResultKey;
    item: ResultItem;
    shared: object;
}) => boolean | void;
/**
 * generate an dot access function for specified path
 *
 * 生成一个使用点操作符访问对应路径数据的访问器
 *
 * @param {string} pathStr path string defined with dot access
 * @returns {DotAccessor} Fucntion
 */
export declare function dotAccess(pathStr: string): DotAccessor;
export declare class Aggregator {
    _last: Aggregator;
    context: {
        _data: ResultData;
        _shared: object;
        _export: object;
        _extract: Classifier;
        _filter: Filter;
        _agg?: Calculator;
        _calc_base: any;
        _sort?: Function;
        _transformer?: Transformer;
        _before?: Function;
        _beforeEach?: Function;
        _after?: Function;
        _afterEach?: Function;
    };
    static from(data: any[]): Aggregator;
    constructor(last?: Aggregator, data?: any[]);
    /**
     * pass a function to filter data before aggregating
     *
     * 传入一个函数用以在聚合前过滤数据
     *
     * @param {Filter} filter function for filtering every datum
     * @returns {this} this
     * @memberof Aggregator
     */
    filter(filter: Filter): this;
    /**
     * pass a function to transform every datum before aggregating
     *
     * 传入一个函数用以在聚合前对数据进行变换
     *
     * @param {Transformer} transformer function for transforming every datum
     * @returns {this} this
     * @memberof Aggregator
     */
    transform(transformer: Transformer): this;
    where(path: any, op: any, value: any): this;
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
    classify(classifier: Classifier | string, path?: string): this;
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
    calc(calculator: Calculator, base?: any): this;
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
    sum(path?: string, base?: any): this;
    /**
     * count the number of datum. Shortcut of .calc((result) => result + 1, base)
     *
     * 统计数据条目数。基本就是 .calc((result) => result + 1, base)
     *
     * @param {number} [base=0] initial result of statistic,default is 0
     * @returns {this} this
     * @memberof Aggregator
     */
    count(base?: number): this;
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
    avg(path?: string): this;
    /**
     * use a comparison function to sort the index that will be provided to user
     *
     * 使用一个比较函数对聚合结果进行排序
     *
     * @param {Comparator} comparator the comparison function
     * @returns {this} this
     * @memberof Aggregator
     */
    sort(comparator: Comparator): this;
    /**
     * run a callback after current aggregation and before sub-aggregation. The callback will be called with {indexes, items, shared}
     *
     * 在当前聚合执行后、子聚合执行前运行一个回调。回调的参数是 {indexes, items, shared}
     *
     * @param {BeforeCallbackFn} fn the callback
     * @returns {this} this
     * @memberof Aggregator
     */
    before(fn: BeforeCallbackFn): this;
    /**
     * run a callback before each sub-aggregation. The callback will be called with {index, item, shared}
     *
     * 在每一个子聚合前运行一个回调。回调的参数是 {index, item, shared}
     *
     * @param {BeforeEachCallbackFn} fn the callback
     * @returns {this} this
     * @memberof Aggregator
     */
    beforeEach(fn: BeforeEachCallbackFn): this;
    /**
     * run a callback before each sub-aggregation. The callback will be called with {index, item, shared}
     *
     * 在每一个子聚合后运行一个回调。回调的参数是 {index, item, shared}
     *
     * @param {AfterEachCallbackFn} fn the callback
     * @returns {this} this
     * @memberof Aggregator
     */
    afterEach(fn: AfterEachCallbackFn): this;
    /**
     * run a callback after sub-aggregation. The callback will be called with {indexes, items, shared}
     *
     * 在子聚合执行后运行一个回调。回调的参数是 {indexes, items, shared}
     *
     * @param {AfterCallbackFn} fn the callback
     * @returns {this} this
     * @memberof Aggregator
     */
    after(fn: AfterCallbackFn): this;
    /**
     *
     *
     * 将当前聚合结果的整个索引以某个命名导出。其结果可以在某些 API 参数的 `shared` 对象中读取到。
     *
     * @param {string} varname the name
     * @returns {this} this
     * @memberof Aggregator
     */
    exportIndexAs(varname: string): this;
    /**
     * ⚠️: You shouldn't use this function
     *
     * ⚠️：你用不上这个函数
     *
     * @memberof Aggregator
     */
    $execute(next: any): void;
    /**
     * execute the aggregation
     *
     * 执行聚合
     *
     * @memberof Aggregator
     */
    execute(): void;
    /**
     * ⚠️: You shouldn't use this function
     *
     * ⚠️：你用不上这个函数
     *
     * @memberof Aggregator
     */
    destroy(): void;
    /**
     * 新建一个子聚合
     *
     * @returns {Aggregator}
     * @memberof Aggregator
     */
    sub(): Aggregator;
}
export declare const aggregator: {
    from(data: any[]): Aggregator;
};
