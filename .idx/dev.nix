# Firebase Studio (IDX) Workspace Configuration
{ pkgs, ... }: {
  # Which nixpkgs channel to use
  channel = "stable-24.05";

  # Installed packages
  packages = [
    pkgs.nodejs_20
    pkgs.nodePackages.npm
  ];

  # Workspace lifecycle hooks
  idx = {
    # Extensions for the IDE
    extensions = [
      "esbenp.prettier-vscode"
      "bradlc.vscode-tailwindcss"
      "dbaeumer.vscode-eslint"
    ];

    # Workspace onCreate event
    workspace = {
      onCreate = {
        npm-install = "npm install";
      };
      onStart = {
        npm-install = "npm install";
      };
    };

    # Development preview configuration
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}
