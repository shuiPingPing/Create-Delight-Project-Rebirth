#!/usr/bin/env python3
"""Check that release archives contain the expected pack files and mod sides."""

import argparse
import json
import tomllib
from collections import Counter
from pathlib import Path
from zipfile import ZipFile


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def expected_mods(side):
    result = []
    for folder in ("common", side):
        for descriptor in (Path("mods") / folder).glob("*.pw.toml"):
            with descriptor.open("rb") as source:
                result.append(tomllib.load(source)["filename"])
    return Counter(result)


def expected_descriptors(side):
    folders = [Path("mods/common"), Path("mods") / side]
    if side == "client":
        folders.extend((Path("resourcepacks"), Path("shaderpacks")))
    # ZIP 里的路径一律是正斜杠；Windows 上 str(Path(...)) 给反斜杠，会让校验误报 descriptor mismatch。
    return {path.as_posix() for folder in folders for path in folder.glob("*.pw.toml")}


# 手工管理、随仓直接分发、没有 .pw.toml 描述符的本地资产（`.gitignore` 白名单放行的自制材质包）。
# 上游这份校验脚本只从描述符推导期望资产，本仓加了自制材质包之后必须显式放行，
# 否则 build 会在「验证发布包内容」报 resource/shader pack mismatch（2026-09-29 首次推 tag 时踩到，见 MIGRATION_LOG P-174）。
LOCAL_MANAGED_CLIENT_ASSETS = ("resourcepacks/no-vanilla-sun.zip",)


def expected_client_assets():
    assets = set()
    for folder in ("resourcepacks", "shaderpacks"):
        for descriptor in Path(folder).glob("*.pw.toml"):
            with descriptor.open("rb") as source:
                assets.add(f"{folder}/{tomllib.load(source)['filename']}")
    for extra in LOCAL_MANAGED_CLIENT_ASSETS:
        if Path(extra).is_file():
            assets.add(extra)
    return assets


def inspect_archive(path, prefix, release_info, side, kind):
    require(path.is_file(), f"Missing archive: {path}")
    with ZipFile(path) as archive:
        bad_file = archive.testzip()
        require(bad_file is None, f"{path.name}: corrupt entry {bad_file}")
        names = [name for name in archive.namelist() if not name.endswith("/")]
        require(len(names) == len(set(names)), f"{path.name}: duplicate ZIP entries")
        base = f"{prefix}/" if prefix else ""
        if kind == "curseforge":
            require("manifest.json" in names, f"{path.name}: missing CurseForge manifest")
            manifest = json.loads(archive.read("manifest.json"))
            with Path("mods/common/create-delight-core.pw.toml").open("rb") as source:
                core = tomllib.load(source)["update"]["curseforge"]
            core_files = [entry for entry in manifest.get("files", [])
                          if entry.get("projectID") == core["project-id"]]
            require(len(core_files) == 1 and core_files[0].get("fileID") == core["file-id"],
                    f"{path.name}: Core CurseForge fileID differs from descriptor")
            relative = {name.removeprefix(base) for name in names if name.startswith(base)}
        else:
            require(all(name.startswith(base) for name in names), f"{path.name}: unexpected ZIP root")
            relative = {name.removeprefix(base) for name in names}
        info = base + "config/createdelight_release_info.json"
        require(info in names and archive.read(info) == release_info,
                f"{path.name}: missing or mismatched release info")
        require("kubejs/config/createdelight_pack_integrity_expected.json" in relative,
                f"{path.name}: missing pack integrity manifest")
        require("start.bat" in relative and "start.sh" in relative,
                f"{path.name}: missing start scripts")

        jars = Counter(name.removeprefix("mods/") for name in relative
                       if name.startswith("mods/") and name.endswith(".jar"))
        descriptors = {name for name in relative if name.endswith(".pw.toml")}
        client_assets = {name for name in relative
                         if name.endswith(".zip") and name.startswith(("resourcepacks/", "shaderpacks/"))}
        if kind == "full":
            expected = expected_mods(side)
            require(jars == expected,
                    f"{path.name}: mod jar mismatch: missing={list((expected - jars).elements())}, "
                    f"extra={list((jars - expected).elements())}")
            # 本 fork 与上游的第 4 处差异：bkmpw 0.1.1 的 `export-client` / `export-server` 产出的是
            # **已展开**的全量包（mods/*.jar + config/ + kubejs/…），**不含 .pw.toml 描述符**；
            # 描述符只出现在 `export-server-installer` 里。上游这份脚本在 full 分支要求描述符齐全，
            # 在本仓必然报 descriptor mismatch（2026-09-29 首次推 tag 时撞到，见 MIGRATION_LOG P-174）。
            # 因此这里只校验「没有多余 / 没有越侧的描述符」，jar 与资源包仍精确比对。
            expected = expected_descriptors(side)
            require(descriptors <= expected,
                    f"{path.name}: unexpected descriptor: {sorted(descriptors - expected)}")
            if side == "client":
                require(not any(name.startswith("mods/server/") for name in descriptors),
                        f"{path.name}: server-only descriptor in client package")
            expected_assets = expected_client_assets() if side == "client" else set()
            require(client_assets == expected_assets,
                    f"{path.name}: resource/shader pack mismatch: "
                    f"missing={sorted(expected_assets - client_assets)}, "
                    f"extra={sorted(client_assets - expected_assets)}")
        elif kind == "installer":
            expected = expected_descriptors(side)
            require(descriptors == expected,
                    f"{path.name}: descriptor mismatch: "
                    f"missing={sorted(expected - descriptors)}, extra={sorted(descriptors - expected)}")
            require(not jars, f"{path.name}: installer unexpectedly bundles mod jars")
            require(not client_assets, f"{path.name}: server installer contains client assets")
            require({"pack.toml", "index.toml", "install-server.bat", "install-server.sh"} <= relative,
                    f"{path.name}: missing pack index or installer scripts")
        else:
            expected = expected_descriptors("client")
            require(descriptors == expected,
                    f"{path.name}: descriptor mismatch: "
                    f"missing={sorted(expected - descriptors)}, extra={sorted(descriptors - expected)}")
            require(not any("/mods/server/" in f"/{name}" for name in descriptors),
                    f"{path.name}: server-only descriptor in client package")
        print(f"{path.name}: OK ({len(relative)} files, {sum(jars.values())} mod jars, "
              f"{len(descriptors)} descriptors)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("artifacts", type=Path)
    parser.add_argument("name")
    parser.add_argument("version")
    parser.add_argument("--curseforge", action="store_true")
    args = parser.parse_args()
    info = (args.artifacts / "release-info.json").read_bytes()
    packages = [
        ("Client-Full", args.name, "client", "full"),
        ("Server", "", "server", "full"),
        ("Server-Installer", "", "server", "installer"),
    ]
    if args.curseforge:
        packages.append(("Client", "overrides", "client", "curseforge"))
    expected_files = {"release-info.json"}
    for label, prefix, side, kind in packages:
        filename = f"[{label}]{args.name}-{args.version}.zip"
        expected_files.add(filename)
        inspect_archive(args.artifacts / filename, prefix, info, side, kind)
    actual_files = {path.name for path in args.artifacts.iterdir() if path.is_file()}
    require(actual_files == expected_files,
            f"Unexpected artifact set: missing={sorted(expected_files - actual_files)}, "
            f"extra={sorted(actual_files - expected_files)}")


if __name__ == "__main__":
    main()
