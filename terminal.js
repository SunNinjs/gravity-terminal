const readline = require(`readline`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on(`SIGINT`, () => { rl.close(); process.exit() })

const fix = (t, b) => t && b ? `%` : ( t && !b ? `*` : ( !t && b ? `.` : ` ` ) )
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const randomInt = (min, max) => Math.round(Math.random() * (max - min + 1) + min)

const WIDTH = 270;
const HEIGHT = 134;
const FRAMES = 100;
const SECONDS = 5;
const SPEED = 1;
const BALLS = 3;
const OBSTACLES = 2;
const DT = (1/FRAMES) * SPEED;
const GRAVITY = 600;
const EARTH_GRAV = 9.8;
const RADIUS = WIDTH > HEIGHT ? WIDTH/60 : HEIGHT/60;
const DAMPER = 1.0; // 1.02 == 1 | Javascript multiplication error

const GRACONSTANT = 6.674 * (10**-11)

/**
 * @param {'North' | 'South' | 'West' | 'East' | 'North-West' | 'North-East' | 'South-West' | 'South-East' | 'Same'} direct 
 * @returns {{ x: Number, y: Number }}
 */
 const dirVar = (direct) => {
  if (direct == `Same`) return { x: 1, y: 1 }
  if (!direct.includes(`-`)) return direct == "North" ? { x: 1, y: 1 } : ( direct == `East` ? { x: 1, y: 1 } : ( direct == 'West' ? { x: -1, y: 1 } : { x: 1, y: -1 } ) )
  let splited = direct.split(`-`);
  let y = splited[0] == `North` ? 1 : -1;
  let x = splited[1] == "East" ? 1 : -1
  return { x, y }
}

class P {
  constructor(x, y, ele = ` `) {
    this.x = x;
    this.y = y;
    this.ele = ele;
  }

  setEle(ele = ` `) {
    this.ele = ele
  }

  setX(x) {
    this.x = x
    return this
  }

  setY(y) {
    this.y = y
    return this
  }

  toString() {
    return `x: ${this.x}, y: ${this.y}, ele: ${this.ele}`
  }
}

//y = Grav *  Math.sqrt(t, 2) /2

class Circle {
  /**
   * @param {P} center 
   * @param {Number} radius 
   * @param {G} grid 
   * @param {P} vel
   * @param {P} pos
   */
  constructor(center, radius, grid) {
    this.center = center;
    this.vel = new P( (0.5 * (EARTH_GRAV * Math.sqrt(DT, 2))) / 2, center.y * (Math.random() < 0.5 ? -1 : 1) );
    this.pos = new P(center.x, center.y, center.ele);
    this.radius = radius;
    this.grid = grid;
    this.h = grid.h;
    this.w = grid.w;

    this.occupied = this.circleArray()
    this.mass = this.occupied.length * 100;
    grid.circle(center, radius)
  }

  /**
   * @returns {Array<P>}
   */
  circleArray() {
    let b = new P( Math.floor(this.center.x - this.radius), Math.floor(this.center.y - this.radius) );
    let e = new P( Math.ceil(this.center.x + this.radius), Math.ceil(this.center.y + this.radius) );

    let result = [];

    for (let y = b.y; y <= e.y; y++) {
      for (let x = b.x; x <= e.x; x++) {
        let d = new P( this.center.x - x , this.center.y - y );
        if (Math.pow(d.x, 2) + Math.pow(d.y, 2) <= Math.pow(this.radius, 2)) {
          if (0 <= x && x < this.h && 0 <= y && y < this.w) result.push(this.grid.array[x][y])
        }
      }
    }

    return result
  }

  addMass(mass) {
    this.mass += mass;
    return this;
  }

  addRadius(rad) {
    this.radius += rad;
    return this
  }

  /**
   * @param {Circle} circle 
   * @returns {Boolean}
   */
  collisionCheck(circle) {
    for (let i = 0; i < circle.occupied.length; i++) {
      let takeP = circle.occupied[i];
      if (this.pointCollisionCheck(takeP)) return true
    }
    return false
  }

  /**
   * @param {P} point 
   * @returns {Boolen}
   */
  pointCollisionCheck(point) {
    let mapped = this.occupied
    let pointmap = point

    if (mapped.includes(pointmap)) return true;
    return false;
  }

  /**
   * @param {Circle} circle 
   * @returns {'North' | 'South' | 'West' | 'East' | 'North-West' | 'North-East' | 'South-West' | 'South-East' | 'Same'}
   */
  direction(circle) {
    let center = this.center;
    let secondCenter = circle.center;

    let first = center.x == secondCenter.x ? `Same` : ( center.x > secondCenter.x ? 'West' : 'East' )
    let second = center.y == secondCenter.y ? `Same` : ( center.y > secondCenter.y ? 'South' : 'North' )
    if (first == 'Same' && second == 'Same') return 'Same';
    if (first == 'Same') return second;
    if (second == 'Same') return first;
    return `${second}-${first}`
  }

  change() {
    let center = this.pos
    let b = new P( Math.floor(center.x - this.radius), Math.floor(center.y - this.radius) );
    let e = new P( Math.ceil(center.x + this.radius), Math.ceil(center.y + this.radius) );

    let result = [];

    for (let y = b.y; y <= e.y; y++) {
      for (let x = b.x; x <= e.x; x++) {
        let d = new P( center.x - x , center.y - y );
        if (Math.pow(d.x, 2) + Math.pow(d.y, 2) <= Math.pow(this.radius, 2)) {
          if (0 <= x && x < this.h && 0 <= y && y < this.w) result.push(this.grid.array[x][y])
        }
      }
    }

    this.occupied = result
    this.grid.circle(center, this.radius)
    return this
  }

  /**
   * @param {Circle} circle 
   */
  gravity(circle) {
    let M = this.mass;
    let m = circle.mass;
    let R = Math.sqrt( ((circle.center.x - this.center.x)**2) + ((circle.center.y - this.center.y)**2) )
    let F = (GRACONSTANT * M * m) / (R**2);
    return F;
  }

}

class G {
  constructor(h = 0, w = h) {
    this.h = h;
    this.w = w;

    this.points = this.createGrid(h, w);
  }

  createGrid(h = 0, w = h) {
    let grid = [];
    for (let i = 0;i < h; i++) {
      let row = [];
      for (let j = 0;j<w;j++) {
        row.push(new P(i, j))
      }
      grid.push(row)
    }
    return grid
  }

  get array() {
    return this.points
  }

  get center() {
    return this.points[this.h/2 - 1][this.w/2 -1]
  }

  get string() {

    let string = ``;
    for (let i=0;i<this.h/2;i++) {
      let row = ``;
      for (let j=0;j<this.w;j++) {
        let t = this.array[2 * i + 0][j];
        let b = this.array[2 * i + 1][j];
        let ele = fix(t.ele == ` ` ? 0 : 1, b.ele == ` ` ? 0 : 1)
        row += ele
      }
      string+=row+`\n`
    }

    return string

    //return this.points.map(ele => ele.map(po => po.ele)).map(ele => ele.join(``)).join(`\n`)
  }

  clear() {
    this.points.flatMap(ele => ele).forEach(ele => ele.setEle())
  }

  circle(center, radius) {
    let b = new P( Math.floor(center.x - radius), Math.floor(center.y - radius) );
    let e = new P( Math.ceil(center.x + radius), Math.ceil(center.y + radius) );

    for (let y = b.y; y <= e.y; y++) {
      for (let x = b.x; x <= e.x; x++) {
        let d = new P( center.x - x , center.y - y );
        if (Math.pow(d.x, 2) + Math.pow(d.y, 2) <= Math.pow(radius, 2)) {
          if (0 <= x && x < this.h && 0 <= y && y < this.w) this.array[x][y].setEle(`*`)
        }
      }
    }

  }

}

async function bouncing() {
  let grid = new G(HEIGHT, WIDTH);

  let balls = [];
  let obstacles = [];
  balls.push(new Circle(grid.center, RADIUS, grid ))
  for (let i = 0; i < BALLS-1; i++) {
    let y = randomInt(0, WIDTH-1);
    let x = randomInt(0, HEIGHT-1);
    balls.push(new Circle( grid.array[x][y], RADIUS, grid ))
  }

  for (let i = 0; i < OBSTACLES; i++) {
    let y = randomInt(0, WIDTH-1);
    let x = randomInt(HEIGHT/2, HEIGHT-1);
    obstacles.push(new Circle( grid.array[x][y], RADIUS/2, grid ))
  }

  let lastCollision = `None`;
  let secondline = `None`;
  let i = 0;
  let collisionFrames = [];
  let text = ``;

  while (text == ``) {
    i++
    grid.clear()

    for (let p = 0; p < obstacles.length; p++) {
      let obj = obstacles[p];
      obj.change()
    }

    for (let j = 0; j < balls.length; j++) {
      let ball = balls[j];
      let { vel, pos } = ball;
      ball.vel = vel.setX(vel.x + GRAVITY*DT);
      let temp = new P( vel.x * DT, vel.y * DT );
      ball.pos = new P( pos.x + temp.x, pos.y + temp.y )

      if (pos.x + ball.radius > HEIGHT) {
        ball.pos = pos.setX(HEIGHT - ball.radius)
        ball.vel = vel.setX(vel.x * -DAMPER)
        lastCollision = `Bottom, Frame: ${i}`
        ball.change()
      }
  
      if (pos.y + ball.radius > WIDTH) {
        ball.pos = pos.setY(WIDTH - ball.radius)
        ball.vel = vel.setY(vel.y * -DAMPER)
        lastCollision = `Right, Frame: ${i}`
        ball.change()
      }
  
      if (0 > pos.y - ball.radius) {
        ball.pos = pos.setY(ball.radius)
        ball.vel = vel.setY(vel.y * -DAMPER)
        lastCollision = `Left, Frame: ${i}`
        ball.change()
      }
  
      if (0 > pos.x - ball.radius) {
        ball.pos = pos.setX(ball.radius)
        ball.vel = vel.setX(vel.x * -DAMPER)
        lastCollision = `Top, Frame: ${i}`
        ball.change()
      }

      for (let o = 0; o < obstacles.length; o++) {
        let obs = obstacles[o];
        if (ball.collisionCheck(obs)) {
          //obstacles.splice(o, 1)
          let Dir = dirVar(obs.direction(ball));
          ball.pos = new P( pos.x + (Dir.x * 2), pos.y + (Dir.y * 2) )
          ball.vel = vel.setY(vel.y * -DAMPER).setX(vel.x * -DAMPER)
          lastCollision = `Ball ${j} with Obstacle ${o}, Frame: ${i}`
          ball.change();
        }
      }
  
      ball.change()

      for (let k=0; k < balls.length; k++) {
        let okBall = balls[k];
        if (okBall == ball) continue;

        if (ball.collisionCheck(okBall)) {
          let direction = dirVar(ball.direction(okBall));
          let oppositeDirection = dirVar(okBall.direction(ball));
          collisionFrames.push({ ball: j, ball2: k, frame: i })
          
          //let temp = new P( vel.x * DT, vel.y * DT );
          //ball.pos = new P( pos.x + temp.x, pos.y + temp.y )

          let index = balls.indexOf(ball);
          let index2 = balls.indexOf(okBall);

          if (ball.mass >= okBall.mass) {
            ball.addRadius(Math.round(okBall.radius/2))
            balls.splice(index2, 1)
            ball.change()
          } else if (ball.mass < okBall.mass) {
            okBall.addRadius(Math.round(ball.radius/2))
            balls.splice(index, 1)
            okBall.change()
          }
          
          secondline = `Frame ${i} | Number ${collisionFrames.length}: Ball ${j} - Ball ${k}, ${`${direction.x} x ${direction.y}`} | ${`${oppositeDirection.x} x ${oppositeDirection.y}`}`
        }

        /*
        if (ball.collisionCheck(okBall)) {
          let Dir = dirVar(ball.direction(okBall));
          let ODir = dirVar(okBall.direction(ball));
          collisionFrames.push({ ball: j, ball2: k, frame: i })

          ball.pos = new P( okBall.pos.x + (ODir.x * 2), okBall.pos.y + (ODir.y * 2) );
          ball.vel = new P( okBall.vel.x * -DAMPER, okBall.vel.y * -DAMPER ) //vel.setY(vel.y * -DAMPER).setX(vel.x * -DAMPER)
          ball.change()

          okBall.pos = new P( ball.pos.x + (Dir.x * 2), ball.pos.y + (Dir.y * 2) );
          okBall.vel = new P( ball.vel.x * -DAMPER, ball.vel.y * -DAMPER ) //vel.setY(vel.y * -DAMPER).setX(vel.x * -DAMPER)
          okBall.change()

          secondline = `Frame ${i} | Number ${collisionFrames.length}: Ball ${j} - Ball ${k}, ${`${Dir.x} x ${Dir.y}`} | ${`${ODir.x} x ${ODir.y}`}`
        }
        */

      }

    }

    rl.question(``, ans => {
      if (ans.toLowerCase() == `q`) {
        text = `Done`;
        console.log(collisionFrames)
      } else if (ans.toLowerCase() == `u`) {
        text = ``
      }
    })

    console.clear()
    console.log(`${i}.\n${grid.string}\n${lastCollision}\n${secondline}`)
    await sleep(1000/FRAMES)
  }

  //for (let i = 0; i < (FRAMES * SECONDS); i++) {}
}

//bouncing()

async function gravity() {
  let grid = new G(HEIGHT, WIDTH);

  let balls = [];
  balls.push(new Circle(grid.center, WIDTH/40, grid ))
  for (let i = 0; i < BALLS-1; i++) {
    let y = randomInt(0, WIDTH-1);
    let x = randomInt(0, HEIGHT-1);
    let ball = new Circle( grid.array[x][y], RADIUS, grid )
    ball.vel = new P(1, 1)
    balls.push(ball)
  }

  let lastCollision = `None`;
  let secondline = `None`;
  let i = 0;
  let collisionFrames = [];
  let text = ``;

  console.log(balls[0].gravity(balls[1]))

  /*
  while (text == ``) {
    i++
    grid.clear()

    for (let j=0;j<balls.length;j++) {
      let ball = balls[j];
      let { vel, pos } = ball;

      //Force = GMm/R^2

      //ball.vel = vel.setX(vel.x + GRAVITY*DT);
      //let temp = new P( vel.x * DT, vel.y * DT );
      //ball.pos = new P( pos.x + temp.x, pos.y + temp.y )

      if (pos.x + ball.radius > HEIGHT) {
        ball.pos = pos.setX(HEIGHT - ball.radius)
        ball.vel = vel.setX(vel.x * -DAMPER)
        lastCollision = `Bottom, Frame: ${i}`
        ball.change()
      }
  
      if (pos.y + ball.radius > WIDTH) {
        ball.pos = pos.setY(WIDTH - ball.radius)
        ball.vel = vel.setY(vel.y * -DAMPER)
        lastCollision = `Right, Frame: ${i}`
        ball.change()
      }
  
      if (0 > pos.y - ball.radius) {
        ball.pos = pos.setY(ball.radius)
        ball.vel = vel.setY(vel.y * -DAMPER)
        lastCollision = `Left, Frame: ${i}`
        ball.change()
      }
  
      if (0 > pos.x - ball.radius) {
        ball.pos = pos.setX(ball.radius)
        ball.vel = vel.setX(vel.x * -DAMPER)
        lastCollision = `Top, Frame: ${i}`
        ball.change()
      }

      ball.change()

    }

    rl.question(``, ans => {
      if (ans.toLowerCase() == `q`) {
        text = `Done`;
        console.log(collisionFrames)
      } else if (ans.toLowerCase() == `u`) {
        text = ``
      }
    })

    console.log(`${i}\n${grid.string}`)
    await sleep(1000/FRAMES)
  }
  */
  
}

gravity()

async function main2() {
  let grid = new G(HEIGHT, WIDTH);
  let circle = new Circle(grid.center, 5, grid);
  let circle2 = new Circle(grid.array[Math.ceil(HEIGHT/2-4)][Math.ceil(WIDTH/2-4)], 5, grid)
  let check = circle.collisionCheck(circle2);
  console.log(`${grid.string}\n${check}`)
}

//main2()

/*

center (5, 5)
radius (2)

top right (x + r, y + r)
top left (x - r, y + r)
bottom right (x + r, y - r)
bottom left (x - r, y - r)

*/
