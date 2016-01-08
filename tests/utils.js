/* global test, equal, deepEqual, ok, RRule, RRuleSet */

;(function (root) {
  /**
   * datetime.datetime
   */
  root.datetime = function (y, m, d, h, i, s) {
    h = h || 0
    i = i || 0
    s = s || 0
    return new Date(y, m - 1, d, h, i, s)
  }

  root.datetimeUTC = function (y, m, d, h, i, s) {
    h = h || 0
    i = i || 0
    s = s || 0
    return new Date(Date.UTC(y, m - 1, d, h, i, s))
  }

  /**
   * dateutil.parser.parse
   */
  root.parse = function (str) {
    var parts = str.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)
    var y = parts[1]
    var m = parts[2]
    var d = parts[3]
    var h = parts[4]
    var i = parts[5]
    var s = parts[6]
    m = Number(m[0] === '0' ? m[1] : m) - 1
    d = d[0] === '0' ? d[1] : d
    h = h[0] === '0' ? h[1] : h
    i = i[0] === '0' ? i[1] : i
    s = s[0] === '0' ? s[1] : s
    return new Date(y, m, d, h, i, s)
  }

  var assertDatesEqual = root.assertDatesEqual = function (actual, expected, msg) {
    msg = msg ? ' [' + msg + '] ' : ''

    if (!(actual instanceof Array)) actual = [actual]
    if (!(expected instanceof Array)) expected = [expected]

    if (expected.length > 1) {
      equal(actual.length, expected.length, msg + 'number of recurrences')
      msg = ' - '
    }

    for (var exp, act, i = 0; i < expected.length; i++) {
      act = actual[i]
      exp = expected[i]
      equal(exp instanceof Date ? exp.toString() : exp,
        act.toString(), msg + (i + 1) + '/' + expected.length)
    }
  }

  var extractTime = function (date) {
    return date != null ? date.getTime() : void 0
  }

  root.testRecurring = function (msg, rruleOrObjOrRRuleSetObj, expectedDates) {
    var rruleOrRRuleSet, method, args

    if (typeof rruleOrObjOrRRuleSetObj === 'function') {
      rruleOrObjOrRRuleSetObj = rruleOrObjOrRRuleSetObj()
    }

    if (rruleOrObjOrRRuleSetObj instanceof RRule || rruleOrObjOrRRuleSetObj instanceof RRuleSet) {
      rruleOrRRuleSet = rruleOrObjOrRRuleSetObj
      method = 'all'
      args = []
    } else {
      rruleOrRRuleSet = rruleOrObjOrRRuleSetObj.rrule
      method = rruleOrObjOrRRuleSetObj.method
      args = rruleOrObjOrRRuleSetObj.args
    }

    // Use text and string representation of the rrule as the message.
    if (rruleOrRRuleSet instanceof RRule) {
      msg = msg + ' [' +
        (rruleOrRRuleSet.isFullyConvertibleToText() ? rruleOrRRuleSet.toText() : 'no text repr') +
        ']' + ' [' + rruleOrRRuleSet.toString() + ']'
    } else {
      msg = msg + rruleOrRRuleSet.toString()
    }

    test(msg, function () {
      var time = Date.now()
      var actualDates = rruleOrRRuleSet[method].apply(rruleOrRRuleSet, args)
      time = Date.now() - time

      equal(time < 100, true,
        rruleOrRRuleSet + '\' method "' + method + '" should finish in 100 ms, but ' + time + ' ms')

      if (!(actualDates instanceof Array)) actualDates = [actualDates]
      if (!(expectedDates instanceof Array)) expectedDates = [expectedDates]

      assertDatesEqual(actualDates, expectedDates)

      // Additional tests using the expected dates
      // ==========================================================

      if (this.ALSO_TEST_SUBSECOND_PRECISION) {
        deepEqual(actualDates.map(extractTime), expectedDates.map(extractTime))
      }

      if (this.ALSO_TEST_STRING_FUNCTIONS) {
        // Test toString()/fromString()
        var string = rruleOrRRuleSet.toString()
        var rrule2 = RRule.fromString(string, rruleOrRRuleSet.options.dtstart)
        var string2 = rrule2.toString()
        equal(string, string2, 'toString() == fromString(toString()).toString()')
        if (method === 'all') {
          assertDatesEqual(rrule2.all(), expectedDates, 'fromString().all()')
        }
      }

      if (this.ALSO_TEST_NLP_FUNCTIONS && rruleOrRRuleSet.isFullyConvertibleToText()) {
        // Test fromText()/toText().
        var text = rruleOrRRuleSet.toText()
        var text2 = rrule2.toText()
        rrule2 = RRule.fromText(text, rruleOrRRuleSet.options.dtstart)
        equal(text2, text, 'toText() == fromText(toText()).toText()')

        // Test fromText()/toString().
        text = rruleOrRRuleSet.toText()
        var rrule3 = RRule.fromText(text, rruleOrRRuleSet.options.dtstart)
        equal(rrule3.toString(), string, 'toString() == fromText(toText()).toString()')
      }

      if (method === 'all' && this.ALSO_TEST_BEFORE_AFTER_BETWEEN) {
        // Test before, after, and between - use the expected dates.
        // create a clean copy of the rrule object to bypass caching
        rruleOrRRuleSet = rruleOrRRuleSet.clone()

        if (expectedDates.length > 2) {
          // Test between()
          assertDatesEqual(
            rruleOrRRuleSet.between(
              expectedDates[0],
              expectedDates[expectedDates.length - 1],
              true
            ),
            expectedDates,
            'between, inc=true'
          )

          assertDatesEqual(
            rruleOrRRuleSet.between(
              expectedDates[0],
              expectedDates[expectedDates.length - 1],
              false
            ),
            expectedDates.slice(1, expectedDates.length - 1),
            'between, inc=false'
          )
        }

        if (expectedDates.length > 1) {
          for (var date, next, prev, i = 0; i < expectedDates.length; i++) {
            date = expectedDates[i]
            next = expectedDates[i + 1]
            prev = expectedDates[i - 1]

            // Test after() and before() with inc=true.
            assertDatesEqual(
              rruleOrRRuleSet.after(date, true), date, 'after, inc=true')
            assertDatesEqual(
              rruleOrRRuleSet.before(date, true), date, 'before, inc=true')

            // Test after() and before() with inc=false.
            next && assertDatesEqual(
              rruleOrRRuleSet.after(date, false), next, 'after, inc=false')
            prev && assertDatesEqual(
              rruleOrRRuleSet.before(date, false), prev, 'before, inc=false')
          }
        }
      }
    })
  }

  root.testRecurring.skip = function (msg) {
    console.warn('Skip ' + msg + '.')
  }

  root.assertStrType = function (msg, rruleOrrruleSet, type) {
    test(msg, function () {
      ok(rruleOrrruleSet instanceof type)
    })
  }
}(this))
