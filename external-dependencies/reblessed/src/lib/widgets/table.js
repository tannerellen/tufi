/**
 * table.js - table element for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

/**
 * Modules
 */

var Node = require('./node');
var Box = require('./box');

/**
 * Table
 */

function Table(options) {
  var self = this;

  if (!(this instanceof Node)) {
    return new Table(options);
  }

  options = options || {};
  options.shrink = true;
  options.style = options.style || {};
  options.style.border = options.style.border || {};
  options.style.header = options.style.header || {};
  options.style.cell = options.style.cell || {};
  options.align = options.align || 'center';

  // Options for table borders
  options.tableBorder = options.tableBorder || {};
  options.tableBorder.top = options.tableBorder.top !== undefined ? options.tableBorder.top : 'noBorderWithSpace';
  options.tableBorder.bottom = options.tableBorder.bottom !== undefined ? options.tableBorder.bottom : 'noBorderWithSpace';
  options.tableBorder.left = options.tableBorder.left !== undefined ? options.tableBorder.left : 'noBorderWithSpace';
  options.tableBorder.right = options.tableBorder.right !== undefined ? options.tableBorder.right : 'noBorderWithSpace';
  options.tableBorder.rows = options.tableBorder.rows !== undefined ? options.tableBorder.rows : 'all';
  options.tableBorderFlags = {};
  options.tableBorderFlags.topSpace = options.tableBorder.top === 'noBorderWithSpace' || options.tableBorder.top === 'border';
  options.tableBorderFlags.topBorder = options.tableBorder.top === 'border';
  options.tableBorderFlags.bottomSpace = options.tableBorder.bottom === 'noBorderWithSpace' || options.tableBorder.bottom === 'border';
  options.tableBorderFlags.bottomBorder = options.tableBorder.bottom === 'border';
  options.tableBorderFlags.leftSpace = options.tableBorder.left === 'noBorderWithSpace' || options.tableBorder.left === 'border';
  options.tableBorderFlags.leftBorder = options.tableBorder.left === 'border';
  options.tableBorderFlags.rightSpace = options.tableBorder.right === 'noBorderWithSpace' || options.tableBorder.right === 'border';
  options.tableBorderFlags.rightBorder = options.tableBorder.right === 'border';
  options.tableBorderFlags.rows = options.tableBorder.rows === 'all';
  options.tableBorderFlags.rowHeader = options.tableBorder.rows === 'all' || options.tableBorder.rows === 'headerOnly';

  // Regular tables do not get custom height (this would
  // require extra padding). Maybe add in the future.
  delete options.height;

  Box.call(this, options);

  this.pad = options.pad != null
    ? options.pad
    : 2;

  this.setData(options.rows || options.data);

  this.on('attach', function() {
    self.setContent('');
    self.setData(self.rows);
  });

  this.on('resize', function() {
    self.setContent('');
    self.setData(self.rows);
    self.screen.render();
  });
}

Table.prototype.__proto__ = Box.prototype;

Table.prototype.type = 'table';

Table.prototype._calculateMaxes = function() {
  var self = this;
  var maxes = [];

  if (this.detached) return;

  this.rows = this.rows || [];

  this.rows.forEach(function(row) {
    row.forEach(function(cell, i) {
      var clen = self.strWidth(cell);
      if (!maxes[i] || maxes[i] < clen) {
        maxes[i] = clen;
      }
    });
  });

  var total = maxes.reduce(function(total, max) {
    return total + max;
  }, 0);
  total += maxes.length + 1;

  // XXX There might be an issue with resizing where on the first resize event
  // width appears to be less than total if it's a percentage or left/right
  // combination.
  if (this.width < total) {
    delete this.position.width;
  }

  if (this.position.width != null) {
    var missing = this.width - total;
    var w = missing / maxes.length | 0;
    var wr = missing % maxes.length;
    maxes = maxes.map(function(max, i) {
      if (i === maxes.length - 1) {
        return max + w + wr;
      }
      return max + w;
    });
  } else {
    maxes = maxes.map(function(max) {
      return max + self.pad;
    });
  }

  return this._maxes = maxes;
};

Table.prototype.setRows =
Table.prototype.setData = function(rows) {
  var self = this
    , text = ''
    , align = this.align;

  this.rows = rows || [];

  this._calculateMaxes();

  if (!this._maxes) return;

  this.rows.forEach(function(row, i) {
    var isHeader = i === 0;
    var isFooter = i === self.rows.length - 1;
    row.forEach(function(cell, i) {
      var width = self._maxes[i];
      var clen = self.strWidth(cell);

      if (i !== 0) {
        text += ' ';
      }

      while (clen < width) {
        if (align === 'center') {
          cell = ' ' + cell + ' ';
          clen += 2;
        } else if (align === 'left') {
          cell = cell + ' ';
          clen += 1;
        } else if (align === 'right') {
          cell = ' ' + cell;
          clen += 1;
        }
      }

      if (clen > width) {
        if (align === 'center') {
          cell = cell.substring(1);
          clen--;
        } else if (align === 'left') {
          cell = cell.slice(0, -1);
          clen--;
        } else if (align === 'right') {
          cell = cell.substring(1);
          clen--;
        }
      }

      text += cell;
    });
    if (!isFooter) {
      if (self.options.tableBorderFlags.rows || (self.options.tableBorderFlags.rowHeader && isHeader)) {
        text += '\n\n';
      } else {
        text += '\n';
      }
    }
  });

  delete this.align;
  this.setContent(text);
  this.align = align;
};

Table.prototype.render = function() {
  var self = this;

  var coords = this._render();
  if (!coords) return;

  this._calculateMaxes();

  if (!this._maxes) return coords;

  var lines = this.screen.lines
    , xi = coords.xi
    , yi = coords.yi
    , rx
    , ry
    , i;

  var dattr = this.sattr(this.style)
    , hattr = this.sattr(this.style.header)
    , cattr = this.sattr(this.style.cell)
    , battr = this.sattr(this.style.border);

  var width = coords.xl - coords.xi - this.iright
    , height = coords.yl - coords.yi - this.ibottom;

  // Apply attributes to header cells and cells.
  for (var y = this.itop; y < height; y++) {
    if (!lines[yi + y]) break;
    for (var x = this.ileft; x < width; x++) {
      if (!lines[yi + y][xi + x]) break;
      // Check to see if it's not the default attr. Allows for tags:
      if (lines[yi + y][xi + x][0] !== dattr) continue;
      if (y === this.itop) {
        lines[yi + y][xi + x][0] = hattr;
      } else {
        lines[yi + y][xi + x][0] = cattr;
      }
      lines[yi + y].dirty = true;
    }
  }

  if (!this.border || this.options.noCellBorders) return coords;

  // Align table border with content cells to account for top row space
  if (self.options.tableBorderFlags.topSpace) {
    ry = 0;
  } else {
    ry = 1;
  }

  // Draw all table border lines.
  for (i = 0; i < self.rows.length + 1; i++) {
    if (!lines[yi + ry]) break;
    var isTopLine = i === 0;
    var isHeaderLine = i === 1;
    var isBottomLine = i === self.rows.length;
    var isMiddleLine = !isTopLine && !isBottomLine;

    // SECTION A: DRAW HORIZONTAL BORDER ROW BEFORE CURRENT CONTENT ROW
    if (
      // Condition for entering a horizontal border row
      (isTopLine && self.options.tableBorderFlags.topSpace) ||
      (isHeaderLine && (self.options.tableBorderFlags.rowHeader || self.options.tableBorderFlags.rows)) ||
      (isMiddleLine && self.options.tableBorderFlags.rows) ||
      (isBottomLine && self.options.tableBorderFlags.bottomSpace)
    ) {
      rx = 0;
      self._maxes.forEach(function(max, i) {
        rx += max;
        var isFirstColumn = i === 0;
        var isLastColumn = i === self._maxes.length - 1;

        // 1. DRAW LEFT EDGE GRID INTERSECTION CHARACTER (only if on first column)
        if (isFirstColumn) {
          if (!lines[yi + ry][xi + 0]) return;
          // left edge
          if (isTopLine) {
            // top-left corner
            if (self.options.tableBorderFlags.topBorder || self.options.tableBorderFlags.leftBorder) {
              lines[yi + ry][xi + 0][0] = battr;
              if (self.options.tableBorderFlags.topBorder && self.options.tableBorderFlags.leftBorder) {
                lines[yi + ry][xi + 0][1] = '\u250c'; // '┌'
              } else if (self.options.tableBorderFlags.topBorder) {
                lines[yi + ry][xi + 0][1] = '\u2500'; // '─'
              } else if (self.options.tableBorderFlags.leftBorder) {
                lines[yi + ry][xi + 0][1] = '\u2502'; // '│'
              }
            }
          } else if (isBottomLine) {
            // bottom-left corner
            if (self.options.tableBorderFlags.bottomBorder || self.options.tableBorderFlags.leftBorder) {
              lines[yi + ry][xi + 0][0] = battr;
              if (self.options.tableBorderFlags.bottomBorder && self.options.tableBorderFlags.leftBorder) {
                lines[yi + ry][xi + 0][1] = '\u2514'; // '└'
              } else if (self.options.tableBorderFlags.bottomBorder && self.options.tableBorderFlags.leftSpace) {
                lines[yi + ry][xi + 0][1] = '\u2500'; // '─'
              } else if (self.options.tableBorderFlags.leftBorder) {
                lines[yi + ry][xi + 0][1] = '\u2502'; // '│'
              }
            }
          } else {
            // middle-left edge
            lines[yi + ry][xi + 0][0] = battr;
            if (self.options.tableBorderFlags.leftBorder) {
              lines[yi + ry][xi + 0][1] = '\u251c'; // '├'
            } else {
              if (self.options.tableBorderFlags.leftSpace) {
                // XXX If we alter iwidth and ileft for no borders - nothing should be written here
                lines[yi + ry][xi + 0][1] = '\u2500'; // '─'
              }
            }
          }
        }

        // 2. DRAW MIDDLE OF ROW NON-INTERSECTION HORIZONTAL DIVIDER CHARACTERS
        if ( !(isTopLine && !self.options.tableBorderFlags.topBorder) && !(isBottomLine && !self.options.tableBorderFlags.bottomBorder) ) {
          for (var hx = rx - max + 1; hx <= rx; hx++) {
            if (self.options.fillCellBorders) {
              var lbg = (ry <= 2 ? hattr : cattr) & 0x1ff;
              lines[yi + ry][xi + hx][0] = (battr & ~0x1ff) | lbg;
            } else {
              lines[yi + ry][xi + hx][0] = battr;
            }
            lines[yi + ry][xi + hx][1] = '\u2500'; // '─'
          }
        }

        // 3A. **EITHER** DRAW RIGHT EDGE BORDER INTERSECTION CHARACTER (if on last column)
        if (isLastColumn) {
          // right edge
          if (!lines[yi + ry][xi + rx + 1]) return;
          rx++;
          if (isTopLine) {
            // top-right corner
            lines[yi + ry][xi + rx][0] = battr;
            if (self.options.tableBorderFlags.topBorder || self.options.tableBorderFlags.rightBorder) {
              if (self.options.tableBorderFlags.topBorder && self.options.tableBorderFlags.rightBorder) {
                lines[yi + ry][xi + rx][1] = '\u2510'; // '┐'
              } else if (self.options.tableBorderFlags.topBorder) {
                lines[yi + ry][xi + rx][1] = '\u2500'; // '─'
              } else if (self.options.tableBorderFlags.rightBorder) {
                lines[yi + ry][xi + rx][1] = '\u2502'; // '│'
              }
            }
          } else if (isBottomLine) {
            // bottom-right corner
            lines[yi + ry][xi + rx][0] = battr;
            if (self.options.tableBorderFlags.bottomBorder || self.options.tableBorderFlags.rightBorder) {
              if (self.options.tableBorderFlags.bottomBorder && self.options.tableBorderFlags.rightBorder) {
                lines[yi + ry][xi + rx][1] = '\u2518'; // '┘'
              } else if (self.options.tableBorderFlags.bottomBorder && self.options.tableBorderFlags.rightSpace) {
                lines[yi + ry][xi + rx][1] = '\u2500'; // '─'
              } else if (self.options.tableBorderFlags.rightBorder) {
                lines[yi + ry][xi + rx][1] = '\u2502'; // '│'
              }
            }
          } else {
            // middle-right edge
            lines[yi + ry][xi + rx][0] = battr;
            if (self.options.tableBorderFlags.rightBorder) {
              lines[yi + ry][xi + rx][1] = '\u2524'; // '┤'
            } else {
              if (self.options.tableBorderFlags.rightSpace) {
                // XXX If we alter iwidth and ileft for no borders - nothing should be written here
                lines[yi + ry][xi + rx][1] = '\u2500'; // '─'
              }
            }
          }

        // 3B. **OR** DRAW MIDDLE COLUMN VERITICAL LINE INTERSECTION CHARACTER (if not on last column)
        } else {
          // middle column dividers
          if (!lines[yi + ry][xi + rx + 1]) return;
          rx++;
          if (isTopLine) {
            // top line
            lines[yi + ry][xi + rx][0] = battr;
            if (self.options.tableBorderFlags.topBorder) {
              lines[yi + ry][xi + rx][1] = '\u252c'; // '┬'
            } else {
              // XXX If we alter iheight and itop for no borders - nothing should be written here
              lines[yi + ry][xi + rx][1] = '\u2502'; // '│'
            }
          } else if (isBottomLine) {
            // bottom line
            lines[yi + ry][xi + rx][0] = battr;
            if (self.options.tableBorderFlags.bottomBorder) {
              lines[yi + ry][xi + rx][1] = '\u2534'; // '┴'
            } else {
              // XXX If we alter iheight and ibottom for no borders - nothing should be written here
              lines[yi + ry][xi + rx][1] = '\u2502'; // '│'
            }
          } else {
            // middle line
            if (self.options.fillCellBorders) {
              var lbg = (ry <= 2 ? hattr : cattr) & 0x1ff;
              lines[yi + ry][xi + rx][0] = (battr & ~0x1ff) | lbg;
            } else {
              lines[yi + ry][xi + rx][0] = battr;
            }
            lines[yi + ry][xi + rx][1] = '\u253c'; // '┼'
          }
        }
      });
      lines[yi + ry].dirty = true;
      ry++
    }

    // SECTION B: DRAW CURRENT CONTENT ROW BORDERS
    if (!isBottomLine) {

      // 4. DRAW CONTENT ROW LEFT NON-INTERSECTION VERTICAL LINE CHARACTER
      if (!lines[yi + ry]) break;
      if (self.options.tableBorderFlags.leftBorder) {
        if (!lines[yi + ry][xi + 0]) return;
        if (self.options.fillCellBorders) {
          var lbg = (ry <= 2 ? hattr : cattr) & 0x1ff;
          lines[yi + ry][xi + 0][0] = (battr & ~0x1ff) | lbg;
        } else {
          lines[yi + ry][xi + 0][0] = battr;
        }
        lines[yi + ry][xi + 0][1] = '\u2502'; // '│'
      }

      // 5. DRAW CONTENT ROW MIDDLE NON-INTERSECTION VERTICAL LINE CHARACTERS
      rx = 0;
      self._maxes.forEach(function(max, i) {
        rx += max + 1;
        var isLastColumn = i === self._maxes.length - 1;
        if ( !(isLastColumn && !self.options.tableBorderFlags.rightBorder) ) {
          if (!lines[yi + ry][xi + rx]) return;
          if (self.options.fillCellBorders) {
            var lbg = (ry <= 2 ? hattr : cattr) & 0x1ff;
            lines[yi + ry][xi + rx][0] = (battr & ~0x1ff) | lbg;
          } else {
            lines[yi + ry][xi + rx][0] = battr;
          }
          lines[yi + ry][xi + rx][1] = '\u2502'; // '│'
        }
      });

      // 6. MOVE DOWN FOR NEXT CONTENT ROW
      lines[yi + ry].dirty = true;
      ry++;
    }

  }

  return coords;
};

/**
 * Expose
 */

module.exports = Table;
