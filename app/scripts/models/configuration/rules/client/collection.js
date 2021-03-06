'use strict';

angular.module('configurationApp')
  .factory('ClientRuleCollection', function(ClientRule, $q, $rootScope, $timeout) {
    var accountFunctions = [
          { $order: 1, value: '-', text: 'None' }
        ],
        attributeFunctions = [
          { $order: 1, value: '*', text: 'Any' }
        ];

    function ClientRuleCollection() {
      this.available = {
        keys: null,
        names: null,
        addresses: null
      };

      this.accounts = null;
      this.accountsById = null;

      this.original = null;
      this.rules = null;
    }

    ClientRuleCollection.prototype.create = function() {
      // Reset rule states to "view"
      this.reset();

      // Create new rule
      var rule = new ClientRule(
        this,
        {
          key: '*',
          name: '*',
          address: '*',

          account: {
            id: '-',
            name: 'None'
          },
          priority: this.rules.length + 1
        },
        'edit'
      );

      this.rules.push(rule);

      // Focus new rule
      $timeout(function() {
        rule.focus();
      })
    };

    ClientRuleCollection.prototype.delete = function(rule) {
      var index = this.rules.indexOf(rule);

      if(index === -1) {
        return;
      }

      // Delete rule from collection
      this.rules.splice(index, 1);

      // Update rule priorities
      this.updatePriorities();
    };

    ClientRuleCollection.prototype.discard = function() {
      // Discard rule changes
      this.updateRules(this.original);

      // Update rule priorities
      this.updatePriorities();

      return $q.resolve();
    };

    ClientRuleCollection.prototype.refresh = function() {
      var self = this;

      return $q.all([
        // Retrieve seen clients
        $rootScope.$s.call('session.client.list').then(
          $.proxy(self.updateClients, self),
          function() {
            return $q.reject('Unable to retrieve clients');
          }
        ),

        // Retrieve client rules
        $rootScope.$s.call('session.client.rule.list', [], {full: true}).then(
          $.proxy(self.updateRules, self),
          function() {
            return $q.reject('Unable to retrieve client rules');
          }
        )
      ]);
    };

    ClientRuleCollection.prototype.reset = function() {
      // Reset rules back to view mode
      _.each(this.rules, function(rule) {
        rule.save();
      });
    };

    ClientRuleCollection.prototype.save = function() {
      var self = this,
          current = _.map(this.rules, function(rule) {
            return rule.current();
          });

      return $rootScope.$s.call('session.client.rule.update', [], {current: current, full: true}).then(
        $.proxy(self.updateRules, self),
        function() {
          return $q.reject('Unable to update client rules');
        }
      );
    };

    ClientRuleCollection.prototype.renderClient = function(item, escape) {
      if(item.type !== 'key') {
        return '<div class="option">' + escape(item.text) + '</div>';
      }

      return (
        '<div class="option client">' +
          '<div class="name">' + escape(item.name) + '</div>' +
          '<small class="extra">' + escape(item.product) + ' / ' + escape(item.text) + '</small>' +
        '</div>'
      );
    };

    ClientRuleCollection.prototype.updateAccounts = function(accounts) {
      this.accounts = [].concat(accountFunctions, accounts);

      this.accountsById = _.indexBy(this.accounts, 'value');
    };

    ClientRuleCollection.prototype.updateClients = function(clients) {
      // Build collection of client keys
      this.available.keys = [].concat(attributeFunctions, _.map(clients, function (client) {
        return {
          $order:   10,
          type:     'key',

          value:    client.key,
          text:     client.key,

          // Extra metadata
          name:     client.name,
          platform: client.platform,
          product:  client.product
        };
      }));

      // Build collection of client names
      this.available.names = [].concat(attributeFunctions, _.map(clients, function (client) {
        return {
          $order: 10,
          type: 'name',

          value: client.name,
          text: client.name
        };
      }));

      // Build collection of client addresses
      this.available.addresses = [].concat(attributeFunctions, _.map(clients, function (client) {
        return {
          $order: 10,
          type: 'address',

          value: client.address,
          text: client.address
        };
      }));
    };

    ClientRuleCollection.prototype.updatePriorities = function() {
      // Update rule priorities
      for(var i = 0; i < this.rules.length; ++i) {
        this.rules[i].priority = i + 1;
      }
    };

    ClientRuleCollection.prototype.updateRules = function(rules) {
      var self = this;

      this.original = angular.copy(rules);

      // Parse rules
      this.rules = _.map(rules, function(rule) {
        return new ClientRule(self, rule);
      });
    };

    return ClientRuleCollection;
  });
