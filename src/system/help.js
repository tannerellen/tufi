/** @type {() => void} */
export function help() {
  console.log("");
  console.log("Tufi - TUI wifi management for Network Manager");

  console.log("");
  console.log("SYNOPSIS");
  console.log(`	tufi [OPTION]`);

  console.log("");
  console.log("DESCRIPTION");
  console.log(
    "	Manage your wifi connections in an easy to use terminal interface. While still allowing the use of Network Manager and all the features it offers. Launch without options to use the app.",
  );

  console.log("");
  console.log("OPTIONS");
  console.log("	-h, --help		Display this help and exit");
  console.log("	-v, --version		Output version information and exit");

  console.log("");
  console.log("EXAMPLES");
  console.log("	Launch interface:	tufi");
  console.log("	Show help:		tufi -h");
  console.log("	Show version:		tufi -v");
  console.log("");
}
