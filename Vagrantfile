# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.provision "shell",
    inline: <<-SHELL
      # install git
      apt-get install -y git

      # clone bu-toolbox
      git clone --depth 1 https://github.com/nbuhay/bu-toolbox.git

      # install Node.js and awscli
      chmod u+x ./bu-toolbox/linux/ubuntu/install/nodejs.sh
      ./bu-toolbox/linux/ubuntu/install/nodejs.sh
      chmod u+x ./bu-toolbox/linux/ubuntu/install/awscli.sh      
      ./bu-toolbox/linux/ubuntu/install/awscli.sh

      # install global gulp.js
      npm install --global gulp

      # local Dynamodb prereq - install Java prereq
      # http://www.webupd8.org/2012/09/install-oracle-java-8-in-ubuntu-via-ppa.html
      add-apt-repository -y ppa:webupd8team/java
      apt-get update
      apt-get -y install default-jre
      apt-get install -y python-software-properties
      # install and start local DynamoDB
      # https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html
      wget https://s3-us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz
      tar -xf dynamodb_local_latest.tar.gz
      java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb &
    SHELL
  config.vm.network "private_network", type: "dhcp"
  config.vm.network "forwarded_port", guest: 3002, host: 3002, host_ip: "127.0.0.1"
  config.vm.synced_folder ".", "/home/vagrant/aws-alexa-color-my-lights"
end