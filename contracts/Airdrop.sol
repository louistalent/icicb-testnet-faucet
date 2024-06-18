// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

contract Airdrop {
    address public owner;
    address public admin;
    uint256 public airdropAmount;
    
    event Received(address _sender, uint _amount);

    constructor() {
        owner = msg.sender;
        admin = msg.sender;
        airdropAmount = 1e18;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }

    function changeOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }
    
    function changeAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
    
    
    function changeAirdropAmount(uint256 newAirdropAmount) external onlyOwner {
        airdropAmount = newAirdropAmount;
    }

    function transfer(address[] calldata addresses) external onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            payable(addresses[i]).transfer(airdropAmount);
        }
    }

    function withdraw(uint256 amount) external onlyAdmin {
        payable(msg.sender).transfer(amount);
    }
    
    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}