'use strict';

var q      = require('q');
var mongo  = require('mongodb');
var Server = mongo.Server;
var Db     = mongo.Db;
var BSON   = mongo.BSONPure;

var database = function() {

	var db;

	var openDb = function(host, port, dbName) {
		var server = new Server(host, port, {
			auto_reconnect : true
		});

		var def = q.defer();
		db = new Db(dbName, server, {
			safe : false
		});
		db.open(function(err, db) {
			if (err) {
				def.reject(err);
			} else {
				def.resolve(db);
			}
		});
		return def.promise;
	};

	var newId = function() {
		return BSON.ObjectID();
	};

	var CollectionWithPromise = ( function() {

			var coll = null;

			function CollectionWithPromise(collection) {
				coll = collection;
			}

			var getById = function(id) {
				var def = q.defer();
				var bsonId;
				try {

					bsonId = new BSON.ObjectID(id.toString());
				} catch(err) {
					var msg = 'There was a problem with the provided Id "' + id + '." '
							msg += 'It cannot be converted to BSON Id.'
					def.reject(msg);
				}
				if (bsonId) {
					coll.findOne({
						'_id' : bsonId
					}, function(err, doc) {
						if (err) {
							def.reject(err);
						} else if (!doc) {
							def.reject('Could not find the record with id "' + id + '."');
						} else {
							def.resolve(doc);
						}
					});
				}
				return def.promise;
			};

			CollectionWithPromise.prototype.getById = function(id) {
				return getById(id);
			};

			CollectionWithPromise.prototype.modify = function(id, modification) {
				var def = q.defer();
				coll.update({
					_id : new BSON.ObjectID(id.toString())
				}, {
					$set : modification
				}, {
					upsert : false,
					safe : true
				}, function(err, recordsUpdate) {
					if (err) {
						def.reject(err);
					} else {
						getById(id).done(function(doc) {
							def.resolve(doc);
						});
					}
				});
				return def.promise;
			};

			CollectionWithPromise.prototype.remove = function(idOrQuery) {
				var def = q.defer();
				var query = idOrQuery;

				var isBsonObjectId = idOrQuery.toHexString;
				var isJsObject = idOrQuery.constructor == Object;

				if (isJsObject) {
					query = idOrQuery;
				} else if (isBsonObjectId) {
					query = {
						'_id' : idOrQuery
					}
				} else {
					query = {
						'_id' : new BSON.ObjectID(idOrQuery.toString())
					}
				}
				coll.remove(query, {
					safe : true
				}, function(err) {
					if (err) {
						def.reject(err);
					} else {
						def.resolve();
					}
				});
				return def.promise;
			};

			CollectionWithPromise.prototype.add = function(item) {
				var def = q.defer();
				coll.insert(item, {
					safe : true
				}, function(err) {
					if (err) {
						def.reject(err);
					} else {
						def.resolve(item);
					}
				});
				return def.promise;
			};

			CollectionWithPromise.prototype.getAll = function(query) {
				var def = q.defer();
				query = query || {};
				coll.find(query, function(err, cursor) {
					if (err) {
						def.reject(err);
					} else {
						cursor.toArray(function(err, items) {
							if (err) {
								def.reject(err);
							} else {
								def.resolve(items);
							}
						});
					}
				});
				return def.promise;
			};

			CollectionWithPromise.prototype.getFirst = function(query) {
				var def = q.defer();
				query = query || {};
				coll.find(query, function(err, cursor) {
					if (err) {
						def.reject(err);
					} else {
						cursor.toArray(function(err, items) {
							if (err) {
								def.reject(err);
							} else {
								if (items.length > 0) {
									def.resolve(items[0]);
								} else {
									def.reject('not found');
								}
							}
						});
					}
				});
				return def.promise;
			};

			return CollectionWithPromise;
		}());
	// var getCollection = function(collectionName){
	// return this.currentDatabase.collection(collectionName);
	// };

	var isConn = false;
	var currentConn = null;
	return {
		isConnected : function() {
			return isConn;
		},
		currentConnection : function() {
			return currentConn;
		},
		connect : function(host, port, dbName) {
			return openDb(host, port, dbName).then(function(db) {
				isConn = true;
				currentConn = db;
			});
		},
		newId : newId,
		collection : function(collectionName) {
			var def = q.defer();
			db.collection(collectionName, function(err, coll) {
				if (err) {
					def.reject(err);
				} else {
					def.resolve(new CollectionWithPromise(coll));
				}
			});
			return def.promise;
		},
		drop : function(collectionName) {
			var def = q.defer();
			
			db.collection(collectionName, function(err, collection) {
				return collection.remove({}, function(err, removed) {
					def.resolve(removed);
				});
			});
			return def.promise;
		},

		//types
		CollectionWithPromise : CollectionWithPromise
	};
}();

module.exports = database;
