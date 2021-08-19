const dhive = require('@hiveio/dhive')
const es = require("event-stream");
const util = require("util");

const client = new dhive.Client(['https://api.hive.blog', 'https://rpc.ecency.com', 'https://api.deathwing.me'])

//const stream = client.blockchain.getOperationsStream({mode: dhive.BlockchainMode.Latest})
const stream = client.blockchain.getBlockStream();
// bot is configured with enviroment variables

// the username of the bot
const DELEGATOR = process.env['DELEGATOR'] || 'ecency'
// the active key of the bot
const ACTIVEKEY = process.env['ACTIVEKEY'] || die('ACTIVEKEY missing')
// the user we want to check and delegate to creations
const CREATOR = process.env['CREATOR'] || 'ocd'
// and the delegation amount
const DAMOUNT = process.env['DAMOUNT'] ? parseFloat(process.env['DAMOUNT']) : parseFloat('9500.123456 VESTS')

const pkey = dhive.PrivateKey.fromString(ACTIVEKEY);

stream
  .pipe(
    es.map(function(block, callback) {
      //console.log(block.transactions)
      const tx = block.transactions;
      let ops = [];
      for (let index = 0; index < tx.length; index++) {
        const etx = tx[index];
        const opp = etx.operations;
        for (let i = 0; i < opp.length; i++) {
          const eop = opp[i];
          if (eop[0] === 'create_claimed_account') {
            if (eop[1].creator === CREATOR) {
              console.log(eop[1]);
              const delegate_op = [
                'delegate_vesting_shares',
                {
                  delegator: DELEGATOR,
                  delegatee: eop[1].new_account_name,
                  vesting_shares: `${DAMOUNT} VESTS`
                },
              ];
              ops.push(delegate_op)
            }
          }  
        }
      }
      if (ops.length) {
        console.log(ops)
        client.broadcast.sendOperations(ops, pkey).then(
          function(result) {
            if (result && result.tx) {
              console.log('delegations updated')
            }
          },
          function(error) {
            console.log(`error happened with transaction`, error)
          }
        );
      }
    })
  )
  .pipe(process.stdout);

function die(msg) { process.stderr.write(msg+'\n'); process.exit(1) }
