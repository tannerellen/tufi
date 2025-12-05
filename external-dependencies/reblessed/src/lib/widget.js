/**
 * widget.js - high-level interface for blessed
 * Copyright (c) 2013-2015, Christopher Jeffrey and contributors (MIT License).
 * https://github.com/chjj/blessed
 */

var widget = exports;
widget.node = require("./widgets/node");
widget.screen = require("./widgets/screen");
widget.element = require("./widgets/element");
widget.box = require("./widgets/box");
widget.text = require("./widgets/text");
widget.line = require("./widgets/line");
widget.scrollablebox = require("./widgets/scrollablebox");
widget.scrollabletext = require("./widgets/scrollabletext");
widget.bigtext = require("./widgets/bigtext");
widget.list = require("./widgets/list");
widget.form = require("./widgets/form");
widget.input = require("./widgets/input");
widget.textarea = require("./widgets/textarea");
widget.textbox = require("./widgets/textbox");
widget.button = require("./widgets/button");
widget.progressbar = require("./widgets/progressbar");
widget.filemanager = require("./widgets/filemanager");
widget.checkbox = require("./widgets/checkbox");
widget.radioset = require("./widgets/radioset");
widget.radiobutton = require("./widgets/radiobutton");
widget.prompt = require("./widgets/prompt");
widget.question = require("./widgets/question");
widget.message = require("./widgets/message");
widget.loading = require("./widgets/loading");
widget.listbar = require("./widgets/listbar");
widget.log = require("./widgets/log");
widget.table = require("./widgets/table");
widget.listtable = require("./widgets/listtable");
// widget.terminal = require("./widgets/terminal"); // Disable terminal as it has other dependencies
widget.image = require("./widgets/image");
widget.ansiimage = require("./widgets/ansiimage");
widget.overlayimage = require("./widgets/overlayimage");
// widget.video = require("./widgets/video"); // Video requires terminal so disabled for now
widget.layout = require("./widgets/layout");
widget.streambox = require("./widgets/streambox");

widget.classes = [
  'Node',
  'Screen',
  'Element',
  'Box',
  'Text',
  'Line',
  'ScrollableBox',
  'ScrollableText',
  'BigText',
  'List',
  'Form',
  'Input',
  'Textarea',
  'Textbox',
  'Button',
  'ProgressBar',
  'FileManager',
  'Checkbox',
  'RadioSet',
  'RadioButton',
  'Prompt',
  'Question',
  'Message',
  'Loading',
  'Listbar',
  'Log',
  'Table',
  'ListTable',
  // 'Terminal', // Disable terminal as it has other dependencies

  'Image',
  'ANSIImage',
  'OverlayImage',
  // 'Video', // Video requires terminal so disabled for now
  'Layout',
  'StreamBox'
];

for (var name of widget.classes) {
  var file = name.toLowerCase();
  widget[name] = widget[file];
}

widget.aliases = {
  'ListBar': 'Listbar',
  'PNG': 'ANSIImage'
};

Object.keys(widget.aliases).forEach(function(key) {
  var name = widget.aliases[key];
  widget[key] = widget[name];
  widget[key.toLowerCase()] = widget[name];
});
