'use strict';

var DepositeContent = function (text) {
  if (text) {
    var o = JSON.parse(text);
    this.balance = new BigNumber(o.balance);
    this.price = new BigNumber(o.price);
    this.text = o.text;
  } else {
    this.balance = new BigNumber(0);
    this.price = new BigNumber(0);
    this.text = "";
  }
};

DepositeContent.prototype = {
  toString: function () {
    return JSON.stringify(this);
  }
};

var BankVaultContract = function () {
  LocalContractStorage.defineMapProperty(this, "bankVault", {
    parse: function (text) {
      return new DepositeContent(text);
    },
    stringify: function (o) {
      return o.toString();
    }
  });
};

// save value to contract, only after height of block, users can takeout
BankVaultContract.prototype = {
  init: function () {
    //TODO:
  },

  createInfo: function (text,price) {
    var from = Blockchain.transaction.from;
    var priceBigNum = new BigNumber(price);
    var balance = new BigNumber(0);

    var orig_deposit = this.bankVault.get(from);
    if (orig_deposit) {
      balance = balance.plus(orig_deposit.balance);
    }

    var deposit = new DepositeContent();
    deposit.price = priceBigNum;
    deposit.text = text;
    deposit.balance = balance;

    this.bankVault.put(from, deposit);
  },

  readInfo: function (address) {

    var deposit = this.bankVault.get(address);
    if (!deposit) {
      throw new Error("No Info before.");
    }

    if (Blockchain.transaction.value.lt(deposit.price)) {
      throw new Error("Amount less than price.");
    }
    Event.Trigger("readInfo", {
          Transfer: {
            from: Blockchain.transaction.from,
            value: Blockchain.transaction.value
          }
        });

    deposit.balance = deposit.balance.add(Blockchain.transaction.value);
    this.bankVault.put(address, deposit);
    
    return deposit.text;
  },
  
  takeout: function (value) {
  var from = Blockchain.transaction.from;
  var amount = new BigNumber(value);

  var deposit = this.bankVault.get(from);
  if (!deposit) {
    throw new Error("No deposit before.");
  }

  if (amount.gt(deposit.balance)) {
    throw new Error("Insufficient balance.");
  }

  var result = Blockchain.transfer(from, amount);
  if (!result) {
    throw new Error("transfer failed.");
  }
  Event.Trigger("BankVault", {
    Transfer: {
      from: Blockchain.transaction.to,
      to: from,
      value: amount.toString()
    }
  });

  deposit.balance = deposit.balance.sub(amount);
  this.bankVault.put(from, deposit);
},
  
  balanceOf: function () {
    var from = Blockchain.transaction.from;
    return this.bankVault.get(from);
  },
  
  verifyAddress: function (address) {
    // 1-valid, 0-invalid
    var result = Blockchain.verifyAddress(address);
    return {
      valid: result == 0 ? false : true
    };
  }
};
module.exports = BankVaultContract;