#!/usr/bin/env bash

storage_patch_volume() {
  local namespace=$1 deployment=$2 volume=$3 source_kind=$4 source_value=${5:-} mount_path=${6:-}
  local current_file patch_file
  current_file=$(mktemp)
  patch_file=$(mktemp)
  "${kube[@]}" get deployment "$deployment" -n "$namespace" -o json >"$current_file"
  python3 - "$current_file" "$volume" "$source_kind" "$source_value" "$mount_path" >"$patch_file" <<'PY'
import json
import sys

current_path, volume_name, source_kind, source_value, mount_path = sys.argv[1:]
with open(current_path, encoding="utf-8") as stream:
    deployment = json.load(stream)
spec = deployment["spec"]["template"]["spec"]
source = ({"persistentVolumeClaim": {"claimName": source_value}}
          if source_kind == "pvc" else {"emptyDir": {}})
volumes = [({"name": volume_name, **source} if item["name"] == volume_name else item)
           for item in spec.get("volumes", [])]
containers = spec["containers"]
if mount_path:
    for container in containers:
        mounts = container.get("volumeMounts", [])
        matching = [mount for mount in mounts if mount["name"] == volume_name]
        if matching:
            replacement = dict(matching[0])
            replacement["mountPath"] = mount_path
            container["volumeMounts"] = [mount for mount in mounts if mount["name"] != volume_name]
            container["volumeMounts"].append(replacement)
print(json.dumps({"spec": {"template": {"spec": {
    "volumes": volumes,
    "containers": containers,
}}}}))
PY
  "${kube[@]}" patch deployment "$deployment" -n "$namespace"     --type=merge --patch-file "$patch_file" >/dev/null
  rm -f "$current_file" "$patch_file"
}

apply_project_storage() {
  local namespace=$1 deployment=$2
  "${kube[@]}" apply -f "$project_dir/scripts/k3s-storage.yaml" >/dev/null
  case "$deployment" in
    lotus-game-lotus-redis)
      storage_patch_volume "$namespace" "$deployment" m0 pvc "lotus-redis-data" ""
      ;;
  esac
}
