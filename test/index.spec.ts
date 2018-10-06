import test from 'tape'
import juhe, {Assert} from '../src/index'

const DATA = [
  {
    timestamp: new Date('2017-07-01'),
    pv: 2246,
    uv: 1345,
    bool: false,
  },
  {
    timestamp: new Date('2017-07-02'),
    pv: 5730,
    uv: 2550,
    bool: true,
  },
  {
    timestamp: new Date('2017-07-03'),
    pv: 4567,
    uv: 3656,
    bool: false,
  },
  {
    timestamp: new Date('2017-07-04'),
    pv: 4679,
    uv: 2366,
    bool: true,
  },
  {
    timestamp: new Date('2017-07-05'),
    pv: 2904,
    uv: 4832,
    bool: false,
  }
]

test('transform', function(t) {
  const agg = juhe.from(DATA)
  agg
  .transform((datum, i) => {
    datum.index = i
    return datum
  })
  .beforeAllSub(({indexes}) => {
    t.plan(indexes.length)
  })
  .beforeEachSub(({index, result, shared}) => {
    t.true(result.rawdata[0].hasOwnProperty('index'))
  })
  .execute()
})

test('where', function(t) {
  const agg = juhe.from(DATA).where(
    Assert.and(
      true,
      ['pv', '>=', 3000],
      ['uv', '>=', 2000],
      Assert.not(['timestamp', '>', +new Date('2017-07-03')])
    )
  )

  const r0 = agg.context._filter(DATA[0])
  const r1 = agg.context._filter(DATA[1])
  const r2 = agg.context._filter(DATA[2])
  const r3 = agg.context._filter(DATA[3])
  const r4 = agg.context._filter(DATA[4])
  t.false(r0, 'r0')
  t.true(r1, 'r1')
  t.true(r2, 'r2')
  t.false(r3, 'r3')
  t.false(r4, 'r4')

  t.end()
})

