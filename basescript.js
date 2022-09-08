var monster_hunter_position = {
  x: parent.G.maps.main.npcs[24].position[0],
  y: parent.G.maps.main.npcs[24].position[1],
  map: "main",
};
var attack_mode = true;
const farm_monster = "goo";
var monster_hunt_whitelist = [farm_monster, "bee", "goo", "crab"];
const hp_pot = "hpot0";
const mp_pot = "mpot0";
const pot_stack = 200;
var sell_whitelist = ["ringsj", "hpamulet", "hpbelt","slimestaff","wshoes"];
var keep_whitelist = [hp_pot, mp_pot];
var party_list = ["merchlevin", "Levin", "Palalevin", "warrlevin"];
var farmer_gold_min = 10000;

if (character.ctype == "merchant") {
  start_character(party_list[1], "master");
  start_character(party_list[2], "master");
  start_character(party_list[3], "master");
}

setInterval(function () {
  handle_use_potions(200, 300);
  handle_inventory();
  handle_stand();
  handle_monster_hunts();
  handle_party();
  handle_respawn();
  loot();

  if(get_player(party_list[0])){
  if (get_player(party_list[0]).ctype == "merchant") {
    send_to_merchant();
  }
}
}, 250);

var last_use_hp_potion = null;
var last_use_mp_potion = null;

function handle_use_potions(hp, mp) {
  if (character.mp <= character.mp_cost * 5) {
    if (
      last_use_mp_potion == null ||
      new Date() - last_use_mp_potion >= parent.G.skills.use_mp.cooldown
    ) {
      use("mp");
      last_use_mp_potion = new Date();
    }
  } else if (character.hp <= character.max_hp - 200) {
    if (
      last_use_hp_potion == null ||
      new Date() - last_use_hp_potion >= parent.G.skills.use_hp.cooldown
    ) {
      use("hp");
      last_use_hp_potion = new Date();
    }
  } else if (character.mp <= character.max_mp - 300) {
    if (
      last_use_mp_potion == null ||
      new Date() - last_use_mp_potion >= parent.G.skills.use_mp.cooldown
    ) {
      use("mp");
      last_use_mp_potion = new Date();
    }
  }
}

var last_respawn = null;
function handle_respawn() {
  if (character.rip) {
    if (last_respawn == null || new Date() - last_respawn >= 10000) {
      respawn();
      last_respawn = new Date();
    }
  }
}
//Get distance to target
function distance_to_target(target) {
  var dist = null;
  if (target) {
    var dist = distance(character, target);
  }
  return dist;
}
//atack monsters
function attack_monsters() {
  if (character.ctype == "merchant") {return;}
  if (!attack_mode) {
    return;
  }
  var target = get_targeted_monster();

  //Check monster hunts
  if (!target) {
    //update target
    target = get_nearest_monster({ no_target: true, type: farm_monster });
    if (target) {
      change_target(target);
    } else {
      if (!smart.moving) {
        //pathfind to monster
        smart_move(farm_monster);
      }
    }
  } else {
    if (distance_to_target(target) > character.range) {
      var movex = character.real_x + (target.x - character.x) / 4;
      var movey = character.real_y + (target.y - character.real_y) / 4;
      move(movex, movey);
      //check if you char is not cc'ed or attack is on cd
    }
    if (!parent.is_disabled(character) && !is_on_cooldown("attack")) {
      set_message("Attacking");
      attack(target);
    }
  }
}
function handle_inventory() {
  var x = character.real_x;
  var y = character.real_y;
  var map = character.map;
  var mpot_amount = quantity(mp_pot);
  var hpot_amount = quantity(hp_pot);

  if (character.esize < 5 || mpot_amount < 5 || hpot_amount < 5) {
    attack_mode = false;
    if (!smart.moving) {
      smart_move("potions", () => {
        sell_items();
        buy_with_gold(mp_pot, pot_stack - mpot_amount);
        buy_with_gold(hp_pot, pot_stack - hpot_amount);
      });
      if (!smart.moving) {
        smart_move({ x: x, y: y, map: map }, () => (attack_mode = true)); //Return back to the original position
      }
    }
  }
}
function sell_items() {
  for (let i in character.items) {
    var slot = character.items[i];
    if (slot != null) {
      var item_name = slot.name;
      if (sell_whitelist.includes(item_name)) {
        if (!slot.p) {
          //if not shiny
          sell(i, 9999);
        }
      }
    }
  }
}
function handle_party() {
  //Party leader
  if (character.name == party_list[0]) {
    if (Object.keys(parent.party).length < party_list.length) {
      for (let i in party_list) {
        let player = party_list[i];
        if (player != party_list[0]) {
          send_party_invite(player);
        }
      }
    }
  }
  // farmers
  if (!character.party) {
    if (character.name != party_list[0]) {
      accept_party_invite(party_list[0]);
    }
  } else {
    if (character.party != party_list[0]) {
      //wrong party leave
      leave_party();
    }
  }
}

function send_to_merchant() {
  if (character.ctype != "merchant") {
    let merchant = get_player(party_list[0]);
    if (character.gold > farmer_gold_min * 2) {
      send_gold(party_list[0], character.gold - farmer_gold_min);
    }
    for (let i in character.items) {
      var slot = character.items[i];
      if (slot != null) {
        var item_name = slot.name;
        if (!keep_whitelist.includes(item_name)) {
          send_item(merchant, i, 9999);
        }
      }
    }
  }
}

function handle_monster_hunts() {
  if (character.ctype != "merchant") {
    if (character.s.monsterhunt) {
      //check kill count
      if (character.s.monsterhunt.c > 0) {
        var hunt_type = character.s.monsterhunt.id;
        if (monster_hunt_whitelist.includes(hunt_type)) {
          var nearest = get_nearest_monster({
            no_target: true,
            type: hunt_type,
          });
          var target = get_targeted_monster();
          if (!target) {
            if (nearest) {
              change_target(nearest);
            } else {
              if (!smart.moving) {
                smart_move(hunt_type);
              }
            }
          }
        } else {
          // hunt target not in whitelist farm normal farm monster
          attack_monsters();
        }
      } else {
        //quest end
        if (!smart.moving) {
          smart_move(monster_hunter_position, () => {
            parent.socket.emit("monsterhunt"); //Turn quest in
          });
        }
      }
    } else {
      if (!smart.moving) {
        smart_move(monster_hunter_position, () => {
          //get quest daisy
          parent.socket.emit("monsterhunt"); //talk daisy
          //use timeout to prevent double click
          setTimeout(() => {
            parent.socket.emit("monsterhunt"); //accept hunt
          }, character.ping);
        });
      }
    }
  }
}

function handle_stand(){
  if(character.ctype != "merchant"){return;}
  if(character.esize == 0){
    //walk to town square
    if(!smart.moving){
      smart_move('main', () => {
        //open stand 
        open_stand();
      });
    }
    //when inv cleared close stand
    if(character.esize >= 40){
      close_stand();
      //walk back to farmers 
      if(!smart.moving){
        smart_move(farm_monster);
      }
    }
  }
}