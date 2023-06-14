'use strict';

/////////////////////////////////////////////////
/////////////////////////////////////////////////
// BANKIST APP

// Data
const account1 = {
  owner: 'Jonas Schmedtmann',
  movements: [200, 450, -400, 3000, -650, -130, 70, 1300],
  interestRate: 1.2, // %
  pin: 1111,
};

const account2 = {
  owner: 'Jessica Davis',
  movements: [5000, 3400, -150, -790, -3210, -1000, 8500, -30],
  interestRate: 1.5,
  pin: 2222,
};

const account3 = {
  owner: 'Steven Thomas Williams',
  movements: [200, -200, 340, -300, -20, 50, 400, -460],
  interestRate: 0.7,
  pin: 3333,
};

const account4 = {
  owner: 'Sarah Smith',
  movements: [430, 1000, 700, 50, 90],
  interestRate: 1,
  pin: 4444,
};

const accounts = [account1, account2, account3, account4];

// Elements
const labelWelcome = document.querySelector('.welcome');
const labelDate = document.querySelector('.date');
const labelBalance = document.querySelector('.balance__value');
const labelSumIn = document.querySelector('.summary__value--in');
const labelSumOut = document.querySelector('.summary__value--out');
const labelSumInterest = document.querySelector('.summary__value--interest');
const labelTimer = document.querySelector('.timer');

const containerApp = document.querySelector('.app');
const containerMovements = document.querySelector('.movements');

const btnLogin = document.querySelector('.login__btn');
const btnTransfer = document.querySelector('.form__btn--transfer');
const btnLoan = document.querySelector('.form__btn--loan');
const btnClose = document.querySelector('.form__btn--close');
const btnSort = document.querySelector('.btn--sort');

const inputLoginUsername = document.querySelector('.login__input--user');
const inputLoginPin = document.querySelector('.login__input--pin');
const inputTransferTo = document.querySelector('.form__input--to');
const inputTransferAmount = document.querySelector('.form__input--amount');
const inputLoanAmount = document.querySelector('.form__input--loan-amount');
const inputCloseUsername = document.querySelector('.form__input--user');
const inputClosePin = document.querySelector('.form__input--pin');

const displayMovements = function (movements){
  document.querySelector('.movements').innerHTML='';
  movements.forEach(function (mov, i){
    const type = (mov>0)? 'deposit' : 'withdrawal';
    const html=`
    <div class="movements__row">
    <div class="movements__type movements__type--${type}">${i+1} ${type}</div>
    <div class="movements__value">${mov}</div>
    `;

    containerMovements.insertAdjacentHTML('afterbegin', html);
  });
};

displayMovements(account1.movements);
/////////////////////////////////////////////////
/////////////////////////////////////////////////
// LECTURES


const movements = [200, 450, -400, 3000, -650, -130, 70, 1300];

for (const [i, movement] of movements.entries()){
  if (movement>0){
    console.log(`Movement ${i+1} You deposited ${movement}`);
  }
  else{
    console.log(`Movement You withdrew ${movement}`);
  }
}

movements.forEach(function(mov, i, arr){
  if (mov>0){
    console.log(`Movement ${i+1} You deposited ${mov}`);
  }
  else{
    console.log(`Movement ${i+1} You withdrew ${Math.abs(mov)}`);
  }
})


/////////////////////////////////////////////////
let arr = ['a', 'b', 'c', 'd', 'e'];

//Slice 
console.log(arr.slice(2));
console.log(arr.slice(2,4));
console.log(arr.slice(-2));

//Splice
console.log(arr.splice(2));

const arr1 = [23, 11, 64];
console.log(arr[0]);
console.log(arr.at(0 ));

const currencies = new Map([
  ['USD', 'United States dollar'],
  ['EUR', 'Euro'],
  ['GBP', 'Pound sterling'],
]);

currencies.forEach(function(value, key, map){
  console.log(`${key}: ${value}`);
});

const apiKey = '9a7dea0e2aa946c48e769034c5321b30';
const apiUrl = 'https://openexchangerates.org/api';

const baseCurrency = 'USD';
const targetCurrency = 'EUR';
let currencyConv=' ';
fetch(`${apiUrl}/latest.json?app_id=${apiKey}&base=${baseCurrency}`)
  .then(response => response.json())
  .then(data => {
    currencyConv = data.rates[targetCurrency];
    console.log(currencyConv);
  })
  .catch(error => {
    console.log('Error:', error);
  });

// const checkDogs = function(dogsJulia, dogsKate){
//   const dogsJuliaCrrct= dogsJulia.slice();
//   dogsJuliaCrrct.splice(0,1);
//   dogsJuliaCrrct.splice(-2);
//   const dogs= dogsJuliaCorrected.concat(dogsKate);
//   console.log(dogs);


//   dogs.forEach(function(dog, i){
//     if (dog>=3){
//       console.log(`Dog number ${i+1} is and adult and is ${dog} years old`);
//     }else{
//       console.log(`Dog number ${i+1} is not and adult and is ${dog} years old`);
//     }
//   })
// }

// checkDogs([3,5,2,12,17],[4,1,15,8,3]);