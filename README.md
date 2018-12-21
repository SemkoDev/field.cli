# Field

Field is a Proxy for your IRI, that sends regular statistics
to the Field server (http://field.deviota.com) and accepts jobs from the
server's load balancer (optional).

## Table of contents

* [Getting Started](#getting-started)
  * [Prerequisites](#prerequisites)
  * [Installing](#installing)
  * [Upgrading](#upgrading)
  * [Running as a service](#running-as-a-service)
* [Docker](#docker)
* [Building Locally](#building-locally)
* [Configuration](#configuration)
  * [config.ini](#config.ini)
  * [Command line options](#command-line-options)
  * [Options description](#options-description)
* [FAQ](#faq)
* [Contributing](#contributing)
  * [Donations](#donations)
  * [Donate to the Nodes](#donate-to-the-nodes)
* [Authors](#authors)
* [License](#license)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine.

### Prerequisites

It is expected that you have already installed Java, downloaded the IRI jar file
and know how to start it. The local IRI instance must have api enabled and accepting local connections.

Field is running on Node.js You will have to install **node (at least version LTS 8.9.4)** and _npm_ (node package manager) on your system.
Alternatively to npm you can (and should) use yarn package manager.

#### Port Forwarding

If you are trying to run a Field node at home, you may need to open some ports (port forwarding) in your NAT Router,
apart of the ports for your IRI:

* **TCP 21310**

Please refer to your Router's manual on how to do that.

Furthermore, please be aware that apart of firewall and port-forwarding in router, your Internet provider may also be an issue.
Some providers (like Vodafone in Germany) do not have enough IPv4 addresses for homes and
thus use something called "**IPv4 over DS Lite**". In those cases the **traffic will not come through** over the ports
mentioned above. Unfortunately, there is no quick fix for this issue (maybe changing providers).
There is some hope with the upcoming PCP-protocol, this will not happen this year (2018) for most providers, though.

#### WARNING FOR IMAGE-BASED LINUX INSTALLATIONS

Field relies on a unique machine identification. Image-based/VPS installations usually
have the same id. If you run it, your field might be blacklisted or wrongly listed
on the field server. To change the ID, do the following:

```
# 1. Remove the existing machine ID file:
sudo rm /var/lib/dbus/machine-id

# 2. Generate a new machine id:
sudo dbus-uuidgen --ensure

# 3. Reboot to apply the new machine ID system-wide:
sudo shutdown -r now
```

#### WARNING FOR UBUNTU

Ubuntu 16.04 apt comes with an **outdated Node version (4.X)**. You need to install the latest version separately:

https://nodejs.org/en/download/package-manager/

### Installing

Globally install Field

```
npm install -g field.cli
```

And run it

```
field --pow --address SOZAIPJMQUBOFCTDTJJDXCZEKNIYZGIGVDLFMH9FFBAYK9SWGTBCWVUTFHXDOUESZAXRJJCJESJPIEQCCKBUTVQPOW
```

The `--pow` option allows the Field server to pass "attachToTangle" jobs to your IRI.

With the `--address` option you can specify an IOTA address for donations.

Below is the list of all possible options.

### Upgrading

To upgrade your Field to version X.X.X, simply run:

```
npm install -g field.cli@x.x.x
```

**Please check where npm installs your global packages**! It happens very often that the first installed binary
is put into `/usr/local/bin` and the updated into `/usr/bin`. Run `field --version` after the upgrade
to make sure you are using the most recent one. Update your scripts and/or services to point to the right binary!

### Running as a service

You can use the [node process manager](http://pm2.keymetrics.io/) to run Field as a service.
Just do the following:

```
# Install the process manager:
npm install pm2 -g

# Make pm2 start at startup:
pm2 startup

# Start the Field as service
# If you created a field config somewhere on your system, provide the path to the config:
pm2 start field -- --config /path/to/field-config.ini

# Otherwise you can just do: pm2 start field

# Save current processes runing with pm2 to startup on boot:
pm2 save

# Get Field logs:
pm2 monit
# or
pm2 log
```

## Docker

Provided you have docker installed, Field can be started as follows:

```
docker run <docker opts> romansemko/field.cli <field command line opts>
```

## Building Locally

If you are a developer you may want to build the project locally and play around with the sources.
Otherwise, ignore this section.
Make sure you have [yarn](https://yarnpkg.com) package manager installed.
Checkout the project:

```
git clone https://github.com/SemkoDev/field.cli.git
cd field.cli
```

Install dependencies:

```
yarn
```

Run tests and make binaries:

```
yarn make
```

Try to run Field:

```
node ./dist/field.js --pow -y
```

## Configuration

You are free to either use command line options or an `.ini` file to configure Field. If you use a config
file, it has precedence and all command line options are ignored.

### config.ini

To use a configuration file, run Field with `--config` option:

```
field --config ./config.ini

# Alternatively, set an environment variable:
FIELD_CONFIG= ./config.ini field
```

You can provide one or more of the following options in your ini file. Example:

```
[field]
name = MyField
; Optional, which IP to bind the node on
bindAddress = 0.0.0.0
port = 21310
; If you want Field to generate a custom id, instead of using machine-id.
; This is the safest and favored way:
customFieldId = true

; You can choose which Field(s) to connect to:
fieldHostname[] = field.deviota.com:80
; It can be several Fields. Just repeat:
; fieldHostname[] = field.deviota.com:80
; fieldHostname[] = another.field.com:8080
; fieldHostname[] = mytest.field.com:5000

; IRI connection details:
IRIPort = 14265
IRIHostname = localhost

address = SOZAIPJMQUBOFCTDTJJDXCZEKNIYZGIGVDLFMH9FFBAYK9SWGTBCWVUTFHXDOUESZAXRJJCJESJPIEQCCKBUTVQPOW
; Alternatively to address, you can provide a (NEW) seed
; In this case, the Field client will be generating new, unused addresses dynamically.
; seed = XYZ

; What jobs your node should be able to accept:
; both true         - only attachToTangle jobs accepted
; disableIRI false  - all jobs accepted
; pow false         - no jobs accepted
; both false        - all jobs except attachToTangle accepted
pow = true
disableIRI = false
```

### Command line options

Command line options are named the same as INI options.
Some have additional short versions.

### Options description

| Option              | Description                                                                                                                                                                                                                                                                                 | Default              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| --name              | Name your node. This identifier will appear on the DevIOTA Field Dashboard                                                                                                                                                                                                                  | Deviota Field        |
| --address, -a       | Optional IOTA address for donations.                                                                                                                                                                                                                                                        |                      |
| --seed, -b          | Optional. If no donation address is provided, you can provide a seed. In that case the field client will generate new, unused addresses dynamically. WARNING! Please do not use your usual, main seed. Generate a new one for this occasion. It is easy and adds up to everyone's security. |                      |
| --config, -c        | Path to Field configuration file.                                                                                                                                                                                                                                                           |                      |
| --disableIRI, -d    | Do not allow jobs to be passed from the Field load balancer. Just send the statistics about my node.                                                                                                                                                                                        | false                |
| --fieldHostname, -f | Field Server hostname (including port) or a space-separated list of multiple Field Server hostnames.                                                                                                                                                                                        | field.deviota.com:80 |
| --iriHostname, -h   | Hostname where your IRI instance is running.                                                                                                                                                                                                                                                | localhost            |
| --iriPort, -i       | API port of your IRI instance.                                                                                                                                                                                                                                                              | 14265                |
| --port, -p          | Field port to be used                                                                                                                                                                                                                                                                       | 21310                |
| --silent, -s        | Do not print log messages                                                                                                                                                                                                                                                                   | false                |
| --pow, -w           | Allow attachToTangle jobs to be passed from the Field server load balancer. When disableIRI and pow are true, only PoW work will be passed to IRI.                                                                                                                                          | false                |
| --customFieldId, -y | If you want Field to generate a custom id, instead of using machine-id. This is required for VPS and servers created from an image, which often have the same machine ID.                                                                                                                   | false                |

### Run PoW jobs only

If you disableIRI and set "pow" to true, your node will only pass attachToTangle jobs t IRI.
The jobs will be sent, even if your IRI is not synchronized, since proof-of-work does not require a
synchronized node.

Sample config:

```
# Disable IRI Jobs
disableIRI = true
# Except attachToTangle proof-of-work
pow = true
```

## Contributing

### Donations

**Donations always welcome**:

IYUIUCFNGOEEQHT9CQU9VYJVOJMQI9VYTQGQLTBAKTFIPWWRBFEV9TJWUZU9EYEFPM9VB9QYXTSMCDKMDABASVXPPX```
```

### Donate to the Nodes

We are currently working to add automatic donations to participating nodes based on the work done.
This feature is still in progress, however you can already tip the nodes. Just
go to http://field.deviota.com select a node, copy its donation address and
show it some love!

## Authors

* **Roman Semko** - _SemkoDev_ - (https://github.com/romansemko)

## License

This project is licensed under the ICS License - see the [LICENSE.md](LICENSE.md) file for details
