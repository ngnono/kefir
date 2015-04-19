// .setName

Observable.prototype.setName = function(sourceObs, selfName /* or just selfName */) {
  this._name = selfName ? sourceObs._name + '.' + selfName : sourceObs;
  return this;
};



// .mapTo

Observable.prototype.mapTo = deprecated(
  '.mapTo()',
  '.map(() => value)',
  function(value) {
    return this.map(function() {
      return value;
    }).setName(this, 'mapTo');
  }
);



// .pluck

Observable.prototype.pluck = deprecated(
  '.pluck()',
  '.map((v) => v.prop)',
  function(propertyName) {
    return this.map(function(x) {
      return x[propertyName];
    }).setName(this, 'pluck');
  }
);



// .invoke

Observable.prototype.invoke = deprecated(
  '.invoke()',
  '.map((v) => v.method())',
  function(methodName /*, arg1, arg2... */) {
    var args = rest(arguments, 1);
    return this.map(args ?
      function(x) {
        return apply(x[methodName], x, args);
      } :
      function(x) {
        return x[methodName]();
      }
    ).setName(this, 'invoke');
  }
);




// .timestamp

Observable.prototype.timestamp = deprecated(
  '.timestamp()',
  '.map((v) => {value: v, time: (new Date).getTime()})',
  function() {
    return this.map(function(x) {
      return {value: x, time: now()};
    }).setName(this, 'timestamp');
  }
);




// .tap

Observable.prototype.tap = deprecated(
  '.tap()',
  '.map((v) => {fn(v); return v})',
  function(fn) {
    return this.map(function(x) {
      fn(x);
      return x;
    }).setName(this, 'tap');
  }
);




// .and

Kefir.and = deprecated(
  'Kefir.and()',
  'Kefir.combine([a, b], (a, b) => a && b)',
  function(observables) {
    return Kefir.combine(observables, and).setName('and');
  }
);

Observable.prototype.and = deprecated(
  '.and()',
  '.combine(other, (a, b) => a && b)',
  function(other) {
    return this.combine(other, and).setName('and');
  }
);



// .or

Kefir.or = deprecated(
  'Kefir.or()',
  'Kefir.combine([a, b], (a, b) => a || b)',
  function(observables) {
    return Kefir.combine(observables, or).setName('or');
  }
);

Observable.prototype.or = deprecated(
  '.or()',
  '.combine(other, (a, b) => a || b)',
  function(other) {
    return this.combine(other, or).setName('or');
  }
);



// .not

Observable.prototype.not = deprecated(
  '.not()',
  '.map(v => !v)',
  function() {
    return this.map(not).setName(this, 'not');
  }
);



// .awaiting

function returnsFalse() {
  return false;
}

Observable.prototype.awaiting = function(other) {
  return Kefir.merge([
    this.mapTo(true),
    other.mapTo(false)
  ]).skipDuplicates().toProperty(returnsFalse).setName(this, 'awaiting');
};




// .fromCallback

Kefir.fromCallback = function(callbackConsumer) {
  var called = false;
  return Kefir.fromBinder(function(emitter) {
    if (!called) {
      callbackConsumer(function(x) {
        emitter.emit(x);
        emitter.end();
      });
      called = true;
    }
  }).setName('fromCallback');
};




// .fromNodeCallback

Kefir.fromNodeCallback = function(callbackConsumer) {
  var called = false;
  return Kefir.fromBinder(function(emitter) {
    if (!called) {
      callbackConsumer(function(error, x) {
        if (error) {
          emitter.error(error);
        } else {
          emitter.emit(x);
        }
        emitter.end();
      });
      called = true;
    }
  }).setName('fromNodeCallback');
};




// .fromPromise

Kefir.fromPromise = function(promise) {
  var called = false;
  return Kefir.fromBinder(function(emitter) {
    if (!called) {
      var onValue = function(x) {
        emitter.emit(x);
        emitter.end();
      };
      var onError = function(x) {
        emitter.error(x);
        emitter.end();
      };
      var _promise = promise.then(onValue, onError);

      // prevent promise/A+ libraries like Q to swallow exceptions
      if (_promise && isFn(_promise.done)) {
        _promise.done();
      }

      called = true;
    }
  }).toProperty().setName('fromPromise');
};






// .fromSubUnsub

function fromSubUnsub(sub, unsub, transformer) {
  return Kefir.fromBinder(function(emitter) {
    var handler = transformer ? function() {
      emitter.emit(apply(transformer, this, arguments));
    } : emitter.emit;
    sub(handler);
    return function() {
      unsub(handler);
    };
  });
}

Kefir.fromSubUnsub = deprecated('.fromSubUnsub()', '.fromBinder()', fromSubUnsub);




// .fromEvents

var subUnsubPairs = [
  ['addEventListener', 'removeEventListener'],
  ['addListener', 'removeListener'],
  ['on', 'off']
];

Kefir.fromEvents = function(target, eventName, transformer) {
  var pair, sub, unsub;

  for (var i = 0; i < subUnsubPairs.length; i++) {
    pair = subUnsubPairs[i];
    if (isFn(target[pair[0]]) && isFn(target[pair[1]])) {
      sub = pair[0];
      unsub = pair[1];
      break;
    }
  }

  if (sub === undefined) {
    throw new Error('target don\'t support any of ' +
      'addEventListener/removeEventListener, addListener/removeListener, on/off method pair');
  }

  return fromSubUnsub(
    function(handler) {
      target[sub](eventName, handler);
    },
    function(handler) {
      target[unsub](eventName, handler);
    },
    transformer
  ).setName('fromEvents');
};
