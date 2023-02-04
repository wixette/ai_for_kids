// Derived from JXG.Math.Numerics.Neville. See jsxgraph/src/math/numerics.js for
// the original implementation.

/*
 * Dynamic programming approach for recursive functions.
 * From "Speed up your JavaScript, Part 3" by Nicholas C. Zakas.
 * http://blog.thejit.org/2008/09/05/memoization-in-javascript/
 */
function memoizer(f) {
  var cache, join;
  if (f.memo) {
    return f.memo;
  }
  cache = {};
  join = Array.prototype.join;
  f.memo = function () {
    var key = join.call(arguments);
    return key in cache ? cache[key] : (cache[key] = f.apply(this, arguments));
  };
  return f.memo;
};

/**
 * Computes the binomial coefficient n over k.
 * @function
 * @param {Number} n Fraction will be ignored
 * @param {Number} k Fraction will be ignored
 * @returns {Number} The binomial coefficient n over k
 */
const binomial = memoizer(function (n, k) {
  var b, i;
  if (k > n || k < 0) {
    return NaN;
  }
  k = Math.round(k);
  n = Math.round(n);
  if (k === 0 || k === n) {
    return 1;
  }
  b = 1;
  for (i = 0; i < k; i++) {
      b *= n - i;
      b /= i + 1;
  }
  return b;
});

class ParametricCurve {
  constructor(minT, maxT, funcX, funcY) {
    this.minT = minT;
    this.maxT = maxT;
    this.funcX = funcX;
    this.funcY = funcY;
  }

  getX(t) {
    return this.funcX(t);
  }

  getY(t) {
    return this.funcY(t);
  }

  getXY(t) {
    return {
      x: this.funcX(t),
      y: this.funcY(t),
    }
  }
}

/**
  * Returns the Lagrange polynomials for curves with equidistant nodes, see
  * Jean-Paul Berrut, Lloyd N. Trefethen: Barycentric Lagrange Interpolation,
  * SIAM Review, Vol 46, No 3, (2004) 501-517.
  *
  * @param {Array<{x:number, y:number}}>} points An array of points.
  * @returns {ParametricCurve} The graph of the parametric curve [x(t),y(t)]
  * runs through the given points.
  */
function neville(points) {
  const w = [];
  const makeFct = function (fun) {
    return function (t, suspendedUpdate) {
      let i,
          d,
          s,
          bin = binomial,
          len = points.length,
          len1 = len - 1,
          num = 0.0,
          denom = 0.0;
      if (!suspendedUpdate) {
        s = 1;
        for (i = 0; i < len; i++) {
          w[i] = bin(len1, i) * s;
          s *= -1;
        }
      }
      d = t;
      for (i = 0; i < len; i++) {
        if (d === 0) {
          return points[i][fun];
        }
        s = w[i] / d;
        d -= 1;
        num += points[i][fun] * s;
        denom += s;
      }
      return num / denom;
    };
  };
  return new ParametricCurve(0, points.length - 1, makeFct('x'), makeFct('y'));
};

export { neville };
