// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "./external/IPancakeRouter02.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract Token is IERC20, IERC20Metadata, Ownable {
    string private _name;

    string private _symbol;

    uint256 private _totalSupply;

    address private _liquidityPool;

    address private _pancakeRooter;

    mapping(address => bool) private _lpBlackList;

    mapping(address => uint256) private _balances;

    mapping(address => mapping(address => uint256)) private _allowances;

    /**
     * ON BSC TESTNET :
     * wBnb = 0xae13d989dac2f0debff460ac112a837c89baa7cd
     * router = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1
     * initialSupply = 1000000000000000000000000000000000000
     */
    constructor(string memory name, uint256 totalSupply, string memory symbol) {
        _name = name;
        _symbol = symbol;

        _totalSupply = totalSupply;
        _balances[msg.sender] = totalSupply;

        // Don't use FACTORY.createPair() because it doesn't work when you want to add liquidity to the pool
        // ROUTER.addLiquidityETH don't work due to gas estimation error and we cannot send ETH in the function
    }

    function setLiquidityPool(address _newLiquidityPool) external onlyOwner {
        _liquidityPool = _newLiquidityPool;
    }

    function getLiquidityPool() external view returns (address) {
        return address(_liquidityPool);
    }

    function setPancakeRouter(address _newPancakeRouter) external onlyOwner {
        _pancakeRooter = _newPancakeRouter;
    }

    function getPancakeRouter() external view returns (address) {
        return address(_pancakeRooter);
    }

    function addToLpBlackList(address _address) external onlyOwner {
        _lpBlackList[_address] = true;
    }

    function removeToLpBlackList(address _address) external onlyOwner {
        _lpBlackList[_address] = false;
    }

    function isLpBlackListed(
        address payable _address
    ) external view returns (bool) {
        return _lpBlackList[_address];
    }

    function name() public view virtual override returns (string memory) {
        return _name;
    }

    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(
        address account
    ) public view virtual override returns (uint256) {
        return _balances[account];
    }

    function transfer(
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(
        address spender,
        uint256 amount
    ) public virtual override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        if (msg.sender == _pancakeRooter) {
            require(
                !_lpBlackList[to],
                "LP: Blacklisted from the Liquidity Pool"
            );
        }

        if (to == _pancakeRooter) {
            require(
                !_lpBlackList[msg.sender],
                "LP: Blacklisted from the Liquidity Pool"
            );
        }

        uint256 fromBalance = _balances[from];
        require(
            fromBalance >= amount,
            "ERC20: transfer amount exceeds balance"
        );
        unchecked {
            _balances[from] = fromBalance - amount;
            _balances[to] += amount;
        }

        emit Transfer(from, to, amount);
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(
                currentAllowance >= amount,
                "ERC20: insufficient allowance"
            );
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }
}
