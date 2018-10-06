export declare type rawDatum = any;
/**
 * the string or number retrurned from Classifier
 *
 * 特征提取返回的值
 */
export declare type resultKey = number | string;
/**
 * result of classification
 *
 * 聚合的结果
 *
 * @member key characteristic of this group of rawdata
 * @member rawdata array of rawdata that share the same characteristic
 * @member value value of statistic
 */
export declare type resultItem = {
    key: resultKey;
    rawdata: rawDatum[];
    value: any;
};
export declare type dotPathStr = string;
export declare enum Comparation {
    '==' = 0,
    '===' = 1,
    '!=' = 2,
    '!==' = 3,
    '<' = 4,
    '>' = 5,
    '<=' = 6,
    '>=' = 7
}
export declare type Assertion = dotPathStr | boolean | [dotPathStr, keyof typeof Comparation, string | number | boolean] | {
    'and': Assertion[];
} | {
    'or': Assertion[];
} | {
    'not': Assertion;
};
export declare class Aggregator {
    private _last;
    private context;
    constructor(last?: Aggregator, initdata?: any[]);
    /**
     * pass a function to transform every datum before filtring
     *
     * 传入一个函数用以在过滤前对数据进行变换
     *
     * @param transformer function for transforming every datum
     * @returns {this} this
     * @memberof Aggregator
     */
    transform(transformer: (rawDatum?: rawDatum, index?: number, rawarray?: rawDatum[]) => any): this;
    /**
     * pass a function to filter data before aggregating
     *
     * 传入一个函数用以在聚合前过滤数据
     *
     * @param {Filter} filter function for filtering every datum
     * @returns {this} this
     * @memberof Aggregator
     */
    filter(filter: (rawDatum?: rawDatum, index?: number, rawarray?: rawDatum[]) => boolean): this;
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
    where(assertion: Assertion): this;
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
    classify(classifier: (datum: rawDatum, index?: number, array?: any[]) => resultKey | string, path?: string): this;
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
    calc(calculator: (lsatResult: any, current?: rawDatum, count?: number) => any, base?: any): this;
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
     * use a comparison function to sort the index returned from the aggregation
     *
     * 使用一个比较函数对聚合结果进行排序
     *
     * @param comparator the comparison function
     * @returns {this} this
     * @memberof Aggregator
     */
    sort(comparator: (a: resultItem, b: resultItem) => 1 | 0 | -1): this;
    /**
     * run a callback after current aggregation and before sub-aggregation. The callback will be called with {indexes, items, shared}
     *
     * 在当前聚合执行后、子聚合执行前运行一个回调。回调的参数是 {indexes, resultMap, shared}
     *
     * @param callbackFn the callback that runs before all sub-aggregation
     * @returns {this} this
     * @memberof Aggregator
     */
    beforeAllSub(callbackFn: (args: {
        indexes: resultKey[];
        resultMap: Map<resultKey, resultItem>;
        shared: object;
    }) => void): this;
    /**
     * run a callback before each sub-aggregation. The callback will be called with {index, item, shared}
     *
     * 在每一个子聚合前运行一个回调。回调的参数是 {index, result, shared}
     *
     * @param callbackFn the callback that runs before each sub-aggregation
     * @returns {this} this
     * @memberof Aggregator
     */
    beforeEachSub(callbackFn: (args: {
        index: resultKey;
        result: resultItem;
        shared: object;
    }) => boolean | void): this;
    /**
     * run a callback before each sub-aggregation. The callback will be called with {index, item, shared}
     *
     * 在每一个子聚合后运行一个回调。回调的参数是 {index, result, shared}
     *
     * @param callbackFn the callback that runs after each sub-aggregation
     * @returns {this} this
     * @memberof Aggregator
     */
    afterEachSub(callbackFn: (args: {
        index: resultKey;
        result: resultItem;
        shared: object;
    }) => boolean | void): this;
    /**
     * run a callback after sub-aggregation. The callback will be called with {indexes, items, shared}
     *
     * 在子聚合执行后运行一个回调。回调的参数是 {indexes, resultMap, shared}
     *
     * @param callbackFn the callback that runs after all sub-aggregation
     * @returns {this} this
     * @memberof Aggregator
     */
    afterAllSub(callbackFn: (args: {
        indexes: resultKey[];
        resultMap: Map<resultKey, resultItem>;
        shared: object;
    }) => void): this;
    /**
     *
     *
     * 将当前聚合结果的整个索引以某个命名导出。其结果可以在某些 API 参数的 `shared` 对象中读取到。
     *
     * @param {string} varname the name
     * @returns {this} this
     * @memberof Aggregator
     */
    shareIndexAs(varname: string): this;
    /**
     * ⚠️: You shouldn't use this function
     *
     * ⚠️：你用不上这个函数
     *
     * @memberof Aggregator
     */
    private $execute;
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
    private destroy;
    /**
     * 新建一个子聚合
     *
     * @returns {Aggregator}
     * @memberof Aggregator
     */
    sub(): Aggregator;
}
export declare function from(data: rawDatum[]): Aggregator;
export declare const Assert: {
    and: (...args: Assertion[]) => Assertion;
    or: (...args: Assertion[]) => Assertion;
    not: (assertion: Assertion) => Assertion;
};
declare const _default: {
    from: typeof from;
    Assert: {
        and: (...args: Assertion[]) => Assertion;
        or: (...args: Assertion[]) => Assertion;
        not: (assertion: Assertion) => Assertion;
    };
};
export default _default;
