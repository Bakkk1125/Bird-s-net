const BLOCK_SIZE = 30;
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;

const SHAPES = [
    [[1, 1, 1, 1]],  // I
    [[1, 1], [1, 1]],  // O
    [[1, 1, 1], [0, 1, 0]],  // T
    [[1, 1, 1], [1, 0, 0]],  // L
    [[1, 1, 1], [0, 0, 1]],  // J
    [[1, 1, 0], [0, 1, 1]],  // S
    [[0, 1, 1], [1, 1, 0]]   // Z
];

const COLORS = [
    '#00ffff',  // cyan
    '#ffff00',  // yellow
    '#ff00ff',  // purple
    '#ffa500',  // orange
    '#0000ff',  // blue
    '#00ff00',  // green
    '#ff0000'   // red
];

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCtx = this.nextCanvas.getContext('2d');
        
        this.grid = Array(GRID_HEIGHT).fill().map(() => Array(GRID_WIDTH).fill(0));
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        
        this.currentPiece = this.newPiece();
        this.nextPiece = this.newPiece();
        
        this.dropCounter = 0;
        this.dropInterval = 1000;
        
        this.lastTime = 0;
        this.bindEvents();
        this.update();
    }
    
    newPiece() {
        const shapeIndex = Math.floor(Math.random() * SHAPES.length);
        return {
            shape: SHAPES[shapeIndex],
            color: COLORS[shapeIndex],
            x: Math.floor(GRID_WIDTH / 2) - 1,
            y: 0
        };
    }
    
    draw() {
        // 清空画布
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        this.drawGrid();
        
        // 绘制当前方块
        this.drawPiece(this.ctx, this.currentPiece);
        
        // 绘制下一个方块预览
        this.nextCtx.fillStyle = 'black';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        this.drawPiece(this.nextCtx, {
            ...this.nextPiece,
            x: 1,
            y: 1
        }, 20);
    }
    
    drawGrid() {
        // 绘制已固定的方块
        this.grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.ctx.fillStyle = value;
                    this.ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
                }
            });
        });
    }
    
    drawPiece(ctx, piece, size = BLOCK_SIZE) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = piece.color;
                    ctx.fillRect(
                        (piece.x + x) * size,
                        (piece.y + y) * size,
                        size - 1,
                        size - 1
                    );
                }
            });
        });
    }
    
    move(dir) {
        this.currentPiece.x += dir;
        if (this.collision()) {
            this.currentPiece.x -= dir;
        }
    }
    
    rotate() {
        const original = this.currentPiece.shape;
        const rotated = this.currentPiece.shape[0].map((_, i) =>
            this.currentPiece.shape.map(row => row[row.length - 1 - i])
        );
        this.currentPiece.shape = rotated;
        if (this.collision()) {
            this.currentPiece.shape = original;
        }
    }
    
    collision() {
        return this.currentPiece.shape.some((row, y) =>
            row.some((value, x) => {
                if (!value) return false;
                const newX = this.currentPiece.x + x;
                const newY = this.currentPiece.y + y;
                return newX < 0 || newX >= GRID_WIDTH ||
                       newY >= GRID_HEIGHT ||
                       (newY >= 0 && this.grid[newY][newX]);
            })
        );
    }
    
    merge() {
        this.currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    this.grid[this.currentPiece.y + y][this.currentPiece.x + x] = this.currentPiece.color;
                }
            });
        });
    }
    
    clearLines() {
        let linesCleared = 0;
        outer: for (let y = this.grid.length - 1; y >= 0; y--) {
            for (let x = 0; x < this.grid[y].length; x++) {
                if (!this.grid[y][x]) continue outer;
            }
            
            const row = this.grid.splice(y, 1)[0];
            this.grid.unshift(row.fill(0));
            linesCleared++;
            y++;
        }
        
        if (linesCleared > 0) {
            this.score += linesCleared * 100 * this.level;
            this.lines += linesCleared;
            this.level = Math.floor(this.lines / 10) + 1;
            document.getElementById('score').textContent = this.score;
            document.getElementById('lines').textContent = this.lines;
            document.getElementById('level').textContent = this.level;
            this.dropInterval = Math.max(1000 - (this.level - 1) * 100, 100);
        }
    }
    
    drop() {
        this.currentPiece.y++;
        if (this.collision()) {
            this.currentPiece.y--;
            this.merge();
            this.clearLines();
            if (this.currentPiece.y === 0) {
                this.gameOver = true;
                alert('游戏结束！得分：' + this.score);
                return;
            }
            this.currentPiece = this.nextPiece;
            this.nextPiece = this.newPiece();
        }
        this.dropCounter = 0;
    }
    
    update(time = 0) {
        if (this.gameOver || this.isPaused) return;
        
        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        
        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.drop();
        }
        
        this.draw();
        requestAnimationFrame(this.update.bind(this));
    }
    
    bindEvents() {
        document.addEventListener('keydown', event => {
            if (this.gameOver) return;
            
            switch (event.keyCode) {
                case 37: // 左箭头
                    this.move(-1);
                    break;
                case 39: // 右箭头
                    this.move(1);
                    break;
                case 40: // 下箭头
                    this.drop();
                    break;
                case 38: // 上箭头
                    this.rotate();
                    break;
                case 32: // 空格
                    this.isPaused = !this.isPaused;
                    if (!this.isPaused) this.update();
                    break;
            }
        });
    }
}

// 启动游戏
new Game();
